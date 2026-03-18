const Interview = require("../models/interview.schema");
const aiService = require("../services/aiService");
const { transcribeAudio } = require("../services/transcriptionService");
const { publishInterviewComplete } = require("../config/kafka");
const { registerWebRTCHandlers, isWebRTCAvailable } = require("./webrtcHandler");

const MAX_FOLLOW_UPS_PER_QUESTION = 1;

const registerInterviewHandlers = (io, socket) => {
	registerWebRTCHandlers(socket);

	socket.emit("capabilities", {
		webrtc: isWebRTCAvailable(),
		whisper: !!process.env.OPENAI_API_KEY,
	});

	/**
	 * Candidate joins an interview room using their interview token.
	 */
	socket.on("join-interview", async ({ interviewToken }) => {
		try {
			const interview = await Interview.findOne({
				interview_token: interviewToken,
				is_deleted: false,
			});

			if (!interview) {
				return socket.emit("error", { message: "Interview not found" });
			}

			if (interview.user_id !== socket.user.id) {
				return socket.emit("error", { message: "Unauthorized" });
			}

			if (interview.status === "completed") {
				return socket.emit("interview-already-completed", {
					overall_score: interview.overall_score,
					overall_feedback: interview.overall_feedback,
					strengths: interview.strengths,
					improvements: interview.improvements,
				});
			}

			if (interview.status === "expired") {
				return socket.emit("error", { message: "This interview has expired" });
			}

			if (new Date() > interview.expires_at) {
				interview.status = "expired";
				await interview.save();
				return socket.emit("error", { message: "This interview has expired" });
			}

			socket.join(`interview:${interview._id}`);
			socket.interviewId = interview._id.toString();

			if (interview.status === "scheduled") {
				interview.status = "in_progress";
				interview.started_at = new Date();

				if (interview.questions.length === 0) {
					socket.emit("status-update", { message: "Generating interview questions..." });

					const questions = await aiService.generateQuestions(
						interview.resume_text || "No resume provided",
						interview.job_description || "No job description",
						interview.job_title || "Position",
						interview.total_questions
					);

					interview.questions = questions;
				}

				await interview.save();
			}

			const currentQ = interview.questions[interview.current_question_index];

			socket.emit("interview-started", {
				interviewId: interview._id.toString(),
				jobTitle: interview.job_title,
				totalQuestions: interview.questions.length,
				currentQuestionIndex: interview.current_question_index,
				question: currentQ
					? {
							text: currentQ.question_text,
							category: currentQ.category,
							type: currentQ.question_type,
							index: interview.current_question_index,
						}
					: null,
			});
		} catch (error) {
			console.error("join-interview error:", error);
			socket.emit("error", { message: "Failed to join interview" });
		}
	});

	/**
	 * Receive audio chunk from client's MediaRecorder, transcribe with Whisper,
	 * and send the transcription back to the client in real-time.
	 */
	socket.on("audio-chunk", async (data) => {
		try {
			const audioBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
			if (audioBuffer.length < 1000) return;

			const text = await transcribeAudio(audioBuffer);
			if (text) {
				socket.emit("transcription", { text, isFinal: true });
			}
		} catch (error) {
			console.error("Audio transcription error:", error.message);
		}
	});

	/**
	 * Candidate submits an answer (transcribed text from Whisper or manual input).
	 */
	socket.on("candidate-answer", async ({ answer }) => {
		try {
			if (!socket.interviewId) {
				return socket.emit("error", { message: "Not in an interview session" });
			}

			const interview = await Interview.findById(socket.interviewId);
			if (!interview || interview.status !== "in_progress") {
				return socket.emit("error", { message: "Interview not active" });
			}

			const currentIndex = interview.current_question_index;
			const currentQuestion = interview.questions[currentIndex];

			if (!currentQuestion) {
				return socket.emit("error", { message: "No current question" });
			}

			currentQuestion.candidate_answer = answer;
			currentQuestion.answered_at = new Date();

			socket.emit("status-update", { message: "Evaluating your answer..." });

			const conversationHistory = interview.questions
				.slice(0, currentIndex)
				.filter((q) => q.candidate_answer)
				.map((q) => ({ question: q.question_text, answer: q.candidate_answer }));

			const evaluation = await aiService.evaluateAnswer(
				currentQuestion.question_text,
				answer,
				interview.resume_text || "",
				interview.job_description || "",
				conversationHistory
			);

			currentQuestion.score = evaluation.score;
			currentQuestion.ai_evaluation = evaluation.evaluation;

			const followUpCount = interview.questions.filter(
				(q) =>
					q.question_type === "follow_up" &&
					q.parent_question_index === currentIndex
			).length;

			const shouldFollowUp =
				evaluation.needs_follow_up &&
				evaluation.follow_up_question &&
				followUpCount < MAX_FOLLOW_UPS_PER_QUESTION;

			if (shouldFollowUp) {
				const followUpQ = {
					question_text: evaluation.follow_up_question,
					question_type: "follow_up",
					category: evaluation.follow_up_category || currentQuestion.category,
					parent_question_index: currentIndex,
					candidate_answer: "",
					ai_evaluation: "",
					score: null,
				};

				const insertIndex = currentIndex + 1;
				interview.questions.splice(insertIndex, 0, followUpQ);
				interview.current_question_index = insertIndex;

				await interview.save();

				socket.emit("follow-up-question", {
					question: {
						text: followUpQ.question_text,
						category: followUpQ.category,
						type: "follow_up",
						index: insertIndex,
					},
					totalQuestions: interview.questions.length,
					currentQuestionIndex: insertIndex,
					previousEvaluation: {
						score: evaluation.score,
						feedback: evaluation.evaluation,
					},
				});
			} else {
				const nextIndex = currentIndex + 1;
				const allDone = nextIndex >= interview.questions.length;

				if (allDone) {
					await finishInterview(interview, socket);
				} else {
					interview.current_question_index = nextIndex;
					await interview.save();

					const nextQuestion = interview.questions[nextIndex];
					socket.emit("new-question", {
						question: {
							text: nextQuestion.question_text,
							category: nextQuestion.category,
							type: nextQuestion.question_type,
							index: nextIndex,
						},
						totalQuestions: interview.questions.length,
						currentQuestionIndex: nextIndex,
						previousEvaluation: {
							score: evaluation.score,
							feedback: evaluation.evaluation,
						},
					});
				}
			}
		} catch (error) {
			console.error("candidate-answer error:", error);
			socket.emit("error", { message: "Failed to process answer" });
		}
	});

	/**
	 * Candidate explicitly ends the interview early
	 */
	socket.on("end-interview", async () => {
		try {
			if (!socket.interviewId) return;
			const interview = await Interview.findById(socket.interviewId);
			if (!interview || interview.status !== "in_progress") return;

			await finishInterview(interview, socket);
		} catch (error) {
			console.error("end-interview error:", error);
			socket.emit("error", { message: "Failed to end interview" });
		}
	});

	socket.on("disconnect", () => {
		if (socket.interviewId) {
			socket.leave(`interview:${socket.interviewId}`);
		}
	});
};

async function finishInterview(interview, socket) {
	socket.emit("status-update", { message: "Generating your interview assessment..." });

	try {
		const finalAssessment = await aiService.generateFinalScore(
			interview.questions,
			interview.resume_text || "",
			interview.job_description || "",
			interview.job_title || ""
		);

		interview.status = "completed";
		interview.completed_at = new Date();
		interview.overall_score = finalAssessment.overall_score;
		interview.overall_feedback = finalAssessment.overall_feedback;
		interview.strengths = finalAssessment.strengths || [];
		interview.improvements = finalAssessment.improvements || [];

		await interview.save();

		socket.emit("interview-complete", {
			overall_score: finalAssessment.overall_score,
			overall_feedback: finalAssessment.overall_feedback,
			strengths: finalAssessment.strengths,
			improvements: finalAssessment.improvements,
			recommendation: finalAssessment.recommendation,
			summary: finalAssessment.summary,
		});

		await publishInterviewComplete({
			interview_id: interview._id.toString(),
			application_id: interview.application_id,
			candidate_id: interview.candidate_id,
			job_id: interview.job_id,
			user_id: interview.user_id,
			overall_score: finalAssessment.overall_score,
			overall_feedback: finalAssessment.overall_feedback,
			recommendation: finalAssessment.recommendation,
			completed_at: interview.completed_at.toISOString(),
		});
	} catch (error) {
		console.error("finishInterview error:", error);
		interview.status = "completed";
		interview.completed_at = new Date();
		interview.overall_score = 0;
		interview.overall_feedback = "Assessment generation failed. Please contact support.";
		await interview.save();

		socket.emit("interview-complete", {
			overall_score: 0,
			overall_feedback: "Assessment generation encountered an issue.",
			strengths: [],
			improvements: [],
		});
	}
}

module.exports = registerInterviewHandlers;
