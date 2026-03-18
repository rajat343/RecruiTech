const { requireAuth } = require("../../middleware/auth");
const interviewService = require("./services/interviewService");

const formatInterview = (interview) => ({
	id: interview._id.toString(),
	application_id: interview.application_id,
	candidate_id: interview.candidate_id,
	user_id: interview.user_id,
	job_id: interview.job_id,
	interview_token: interview.interview_token,
	status: interview.status,
	job_title: interview.job_title,
	questions: interview.questions.map((q) => ({
		question_text: q.question_text,
		question_type: q.question_type,
		category: q.category,
		candidate_answer: q.candidate_answer,
		ai_evaluation: q.ai_evaluation,
		score: q.score,
	})),
	current_question_index: interview.current_question_index,
	total_questions: interview.total_questions,
	overall_score: interview.overall_score,
	overall_feedback: interview.overall_feedback,
	strengths: interview.strengths,
	improvements: interview.improvements,
	recording_url: interview.recording_url,
	started_at: interview.started_at?.toISOString(),
	completed_at: interview.completed_at?.toISOString(),
	expires_at: interview.expires_at?.toISOString(),
	createdAt: interview.createdAt.toISOString(),
});

const interviewResolvers = {
	Query: {
		myInterviews: async (_, __, context) => {
			const user = requireAuth(context);
			const interviews = await interviewService.getMyInterviews(user._id.toString());
			return interviews.map(formatInterview);
		},
		interviewForApplication: async (_, { application_id }, context) => {
			const user = requireAuth(context);

			let interview;
			if (user.role === "recruiter") {
				interview = await interviewService.getInterviewForApplicationAsRecruiter(
					user._id.toString(),
					application_id
				);
			} else {
				interview = await interviewService.getInterviewForApplication(application_id);
				if (interview && interview.user_id !== user._id.toString()) {
					return null;
				}
			}
			return interview ? formatInterview(interview) : null;
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
	},
};

module.exports = interviewResolvers;
