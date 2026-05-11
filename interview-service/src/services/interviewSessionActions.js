const aiService = require("./aiService");
const { publishInterviewComplete } = require("../config/kafka");
const {
	MAX_TOTAL_INTERVIEW_QUESTIONS,
	MAX_FOLLOW_UPS_TOTAL,
	FOCUS_PRIMARY_QUESTION_COUNT,
} = require("../constants/interviewLimits");

/**
 * Rows never reached or submitted empty: score 0 so overall = sum of all rows.
 */
const applyUnansweredZeroScores = (questions) => {
	for (const q of questions || []) {
		const ans = String(q.candidate_answer ?? "").trim();
		if (!ans) {
			q.score = 0;
			if (!String(q.ai_evaluation ?? "").trim()) {
				q.ai_evaluation = "No answer provided.";
			}
		}
	}
};

/**
 * Final scoring, persist interview as completed, publish Kafka (no socket I/O).
 */
const finalizeInterviewDocument = async (interview) => {
	try {
		applyUnansweredZeroScores(interview.questions);

		const finalAssessment = await aiService.generateFinalScore(
			interview.questions,
			interview.resume_text || "",
			interview.job_description || "",
			interview.job_title || "",
		);

		interview.status = "completed";
		interview.completed_at = new Date();
		interview.overall_score = finalAssessment.overall_score;
		interview.overall_feedback = finalAssessment.overall_feedback;
		interview.strengths = finalAssessment.strengths || [];
		interview.improvements = finalAssessment.improvements || [];

		await interview.save();

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
		console.error("finalizeInterviewDocument error:", error);
		interview.status = "completed";
		interview.completed_at = new Date();
		applyUnansweredZeroScores(interview.questions);
		interview.overall_score = aiService.sumQuestionScores(interview.questions);
		interview.overall_feedback =
			"Assessment generation failed. Please contact support.";
		await interview.save();
	}
};

/**
 * Evaluate answer and advance session (follow-up, next question, or ready to finalize).
 * Caller must call finalizeInterviewDocument when outcome is pending_complete.
 */
const processCandidateAnswer = async (interview, answer) => {
	if (!interview || interview.status !== "in_progress") {
		const err = new Error("Interview not active");
		err.code = "NOT_ACTIVE";
		throw err;
	}

	const currentIndex = interview.current_question_index;
	const currentQuestion = interview.questions[currentIndex];
	if (!currentQuestion) {
		const err = new Error("No current question");
		err.code = "NO_QUESTION";
		throw err;
	}

	currentQuestion.candidate_answer = answer;
	currentQuestion.answered_at = new Date();

	const trimmedAnswer = String(answer ?? "").trim();
	let evaluation;

	if (!trimmedAnswer) {
		currentQuestion.score = 0;
		currentQuestion.ai_evaluation = "No answer provided.";
		evaluation = {
			score: 0,
			evaluation: currentQuestion.ai_evaluation,
			needs_follow_up: false,
			follow_up_question: null,
			follow_up_category: null,
		};
	} else {
		const conversationHistory = interview.questions
			.slice(0, currentIndex)
			.filter((q) => q.candidate_answer)
			.map((q) => ({ question: q.question_text, answer: q.candidate_answer }));

		evaluation = await aiService.evaluateAnswer(
			currentQuestion.question_text,
			answer,
			interview.resume_text || "",
			interview.job_description || "",
			conversationHistory,
		);

		const raw = evaluation.score;
		const sc = typeof raw === "number" ? raw : Number.parseInt(String(raw), 10);
		currentQuestion.score = Number.isFinite(sc) ? Math.max(0, Math.min(10, Math.round(sc))) : 0;
		currentQuestion.ai_evaluation = evaluation.evaluation;
	}

	const primarySlot = currentQuestion.focus_primary_index;
	const onFirstWavePrimary =
		currentQuestion.question_type === "initial" &&
		typeof primarySlot === "number" &&
		primarySlot >= 0 &&
		primarySlot < FOCUS_PRIMARY_QUESTION_COUNT;

	const totalFollowUps = interview.questions.filter(
		(q) => q.question_type === "follow_up",
	).length;

	const alreadyFollowedThisPrimary =
		onFirstWavePrimary &&
		interview.questions.some(
			(q) =>
				q.question_type === "follow_up" &&
				q.parent_focus_primary_index === primarySlot,
		);

	const roomInList = interview.questions.length < MAX_TOTAL_INTERVIEW_QUESTIONS;

	const shouldFollowUp =
		onFirstWavePrimary &&
		!alreadyFollowedThisPrimary &&
		roomInList &&
		totalFollowUps < MAX_FOLLOW_UPS_TOTAL &&
		evaluation.needs_follow_up &&
		evaluation.follow_up_question;

	if (shouldFollowUp) {
		const followUpQ = {
			question_text: evaluation.follow_up_question,
			question_type: "follow_up",
			category: evaluation.follow_up_category || currentQuestion.category,
			parent_question_index: currentIndex,
			parent_focus_primary_index: primarySlot,
			focus_primary_index: null,
			candidate_answer: "",
			ai_evaluation: "",
			score: null,
		};

		const insertIndex = currentIndex + 1;
		interview.questions.splice(insertIndex, 0, followUpQ);
		interview.current_question_index = insertIndex;
		await interview.save();

		return {
			outcome: "follow_up",
			evaluation,
			current_question_index: insertIndex,
			total_questions: interview.questions.length,
			follow_up_question: followUpQ.question_text,
		};
	}

	const nextIndex = currentIndex + 1;
	const allDone = nextIndex >= interview.questions.length;

	if (allDone) {
		await interview.save();
		return {
			outcome: "pending_complete",
			evaluation,
			current_question_index: currentIndex,
			total_questions: interview.questions.length,
		};
	}

	interview.current_question_index = nextIndex;
	await interview.save();
	const nextQuestion = interview.questions[nextIndex];
	return {
		outcome: "next_question",
		evaluation,
		current_question_index: nextIndex,
		total_questions: interview.questions.length,
		next_question_text: nextQuestion.question_text,
		next_question_category: nextQuestion.category || "",
		next_question_type: nextQuestion.question_type || "",
	};
};

module.exports = {
	finalizeInterviewDocument,
	processCandidateAnswer,
};
