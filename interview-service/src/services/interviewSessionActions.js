const aiService = require("./aiService");
const { publishInterviewComplete } = require("../config/kafka");

const MAX_FOLLOW_UPS_PER_QUESTION = 1;

/**
 * Final scoring, persist interview as completed, publish Kafka (no socket I/O).
 */
const finalizeInterviewDocument = async (interview) => {
	try {
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
		interview.overall_score = 0;
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

	const conversationHistory = interview.questions
		.slice(0, currentIndex)
		.filter((q) => q.candidate_answer)
		.map((q) => ({ question: q.question_text, answer: q.candidate_answer }));

	const evaluation = await aiService.evaluateAnswer(
		currentQuestion.question_text,
		answer,
		interview.resume_text || "",
		interview.job_description || "",
		conversationHistory,
	);

	currentQuestion.score = evaluation.score;
	currentQuestion.ai_evaluation = evaluation.evaluation;

	const followUpCount = interview.questions.filter(
		(q) =>
			q.question_type === "follow_up" &&
			q.parent_question_index === currentIndex,
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
