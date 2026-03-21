const { requireAuth } = require("../../middleware/auth");
const interviewService = require("./services/interviewService");

const formatInterview = (interview, { hideScores = false } = {}) => {
	const base = {
		id: interview._id.toString(),
		application_id: interview.application_id,
		candidate_id: interview.candidate_id,
		user_id: interview.user_id,
		job_id: interview.job_id,
		interview_token: interview.interview_token,
		status: interview.status,
		job_title: interview.job_title,
		current_question_index: interview.current_question_index,
		total_questions: interview.total_questions,
		recording_url: interview.recording_url,
		results_released: interview.results_released,
		started_at: interview.started_at?.toISOString(),
		completed_at: interview.completed_at?.toISOString(),
		expires_at: interview.expires_at?.toISOString(),
		createdAt: interview.createdAt.toISOString(),
	};

	if (hideScores) {
		base.questions = [];
		base.overall_score = null;
		base.overall_feedback = null;
		base.strengths = [];
		base.improvements = [];
	} else {
		base.questions = interview.questions.map((q) => ({
			question_text: q.question_text,
			question_type: q.question_type,
			category: q.category,
			candidate_answer: q.candidate_answer,
			ai_evaluation: q.ai_evaluation,
			score: q.score,
		}));
		base.overall_score = interview.overall_score;
		base.overall_feedback = interview.overall_feedback;
		base.strengths = interview.strengths;
		base.improvements = interview.improvements;
	}

	return base;
};

const interviewResolvers = {
	Query: {
		myInterviews: async (_, __, context) => {
			const user = requireAuth(context);
			const interviews = await interviewService.getMyInterviews(user._id.toString());
			return interviews.map((iv) =>
				formatInterview(iv, { hideScores: !iv.results_released })
			);
		},
		interviewForApplication: async (_, { application_id }, context) => {
			const user = requireAuth(context);

			let interview;
			if (user.role === "recruiter") {
				interview = await interviewService.getInterviewForApplicationAsRecruiter(
					user._id.toString(),
					application_id
				);
				return interview ? formatInterview(interview) : null;
			}

			interview = await interviewService.getInterviewForApplication(application_id);
			if (interview && interview.user_id !== user._id.toString()) {
				return null;
			}
			return interview
				? formatInterview(interview, { hideScores: !interview.results_released })
				: null;
		},
	},
	Mutation: {
		sendAiInterview: async (_, { input }, context) => {
			const user = requireAuth(context);
			if (user.role !== "recruiter") {
				throw new Error("Only recruiters can send AI interviews");
			}
			const interview = await interviewService.sendAiInterview(
				user._id.toString(),
				input
			);
			return formatInterview(interview);
		},
		releaseInterviewResults: async (_, { interview_id }, context) => {
			const user = requireAuth(context);
			if (user.role !== "recruiter") {
				throw new Error("Only recruiters can release interview results");
			}
			const interview = await interviewService.releaseResults(
				user._id.toString(),
				interview_id
			);
			return formatInterview(interview);
		},
	},
};

module.exports = interviewResolvers;
