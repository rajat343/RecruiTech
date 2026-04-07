const Interview = require("../models/interview.schema");
const aiService = require("../services/aiService");
const { transcribeAudio } = require("../services/transcriptionService");
const {
	finalizeInterviewDocument,
	processCandidateAnswer,
} = require("../services/interviewSessionActions");
const { registerWebRTCHandlers, isWebRTCAvailable } = require("./webrtcHandler");

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
			let interview = await Interview.findOne({
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
				return socket.emit("interview-already-completed", {});
			}

			if (interview.status === "expired") {
				return socket.emit("error", { message: "This interview has expired" });
			}

			if (new Date() > interview.expires_at) {
				await Interview.updateOne(
					{ _id: interview._id },
					{ $set: { status: "expired" } },
				);
				return socket.emit("error", { message: "This interview has expired" });
			}

			socket.join(`interview:${interview._id}`);
			socket.interviewId = interview._id.toString();

			// Atomically claim start so concurrent sockets (e.g. React Strict Mode) cannot VersionError on save.
			if (interview.status === "scheduled") {
				const claimed = await Interview.findOneAndUpdate(
					{
						_id: interview._id,
						status: "scheduled",
						is_deleted: false,
					},
					{ $set: { status: "in_progress", started_at: new Date() } },
					{ new: true },
				);

				if (claimed) {
					interview = claimed;
					if (!interview.questions?.length) {
						socket.emit("status-update", {
							message: "Generating interview questions...",
						});

						const questions = await aiService.generateQuestions(
							interview.resume_text || "No resume provided",
							interview.job_description || "No job description",
							interview.job_title || "Position",
							interview.total_questions,
						);

						await Interview.updateOne(
							{ _id: interview._id },
							{ $set: { questions } },
						);
					}
				}
			}

			// Reload for latest questions (another connection may have generated them).
			interview = await Interview.findById(interview._id);
			if (!interview) {
				return socket.emit("error", { message: "Interview not found" });
			}

			// Brief wait if peer is still generating questions.
			let wait = 0;
			while (
				interview.status === "in_progress" &&
				(!interview.questions || interview.questions.length === 0) &&
				wait < 60
			) {
				await new Promise((r) => setTimeout(r, 500));
				interview = await Interview.findById(interview._id);
				wait += 1;
			}

			const currentQ =
				interview.questions?.[interview.current_question_index] || null;

			socket.emit("interview-started", {
				interviewId: interview._id.toString(),
				jobTitle: interview.job_title,
				totalQuestions: interview.questions?.length || 0,
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

			socket.emit("status-update", { message: "Evaluating your answer..." });

			let result;
			try {
				result = await processCandidateAnswer(interview, answer);
			} catch (e) {
				if (e.code === "NO_QUESTION") {
					return socket.emit("error", { message: "No current question" });
				}
				throw e;
			}

			if (result.outcome === "follow_up") {
				socket.emit("follow-up-question", {
					question: {
						text: result.follow_up_question,
						category:
							interview.questions[result.current_question_index].category,
						type: "follow_up",
						index: result.current_question_index,
					},
					totalQuestions: result.total_questions,
					currentQuestionIndex: result.current_question_index,
				});
				return;
			}

			if (result.outcome === "pending_complete") {
				socket.emit("status-update", {
					message: "Generating your interview assessment...",
				});
				await finalizeInterviewDocument(interview);
				socket.emit("interview-complete", {});
				return;
			}

			const nextQuestion =
				interview.questions[result.current_question_index];
			socket.emit("new-question", {
				question: {
					text: nextQuestion.question_text,
					category: nextQuestion.category,
					type: nextQuestion.question_type,
					index: result.current_question_index,
				},
				totalQuestions: result.total_questions,
				currentQuestionIndex: result.current_question_index,
			});
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
	await finalizeInterviewDocument(interview);
	socket.emit("interview-complete", {});
}

module.exports = registerInterviewHandlers;
