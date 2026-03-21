const Interview = require("../models/interview.schema");

const createInterview = async ({
	application_id,
	candidate_id,
	user_id,
	job_id,
	resume_text,
	resume_url,
	job_title,
	job_description,
}) => {
	const existing = await Interview.findOne({
		application_id,
		is_deleted: false,
		status: { $nin: ["expired", "cancelled"] },
	});

	if (existing) {
		return existing;
	}

	const interview = new Interview({
		application_id,
		candidate_id,
		user_id,
		job_id,
		resume_text,
		resume_url,
		job_title,
		job_description,
	});

	await interview.save();
	return interview;
};

const getInterviewByToken = async (token) => {
	return Interview.findOne({
		interview_token: token,
		is_deleted: false,
	});
};

const getInterviewById = async (id) => {
	return Interview.findById(id);
};

const getInterviewsForCandidate = async (userId) => {
	return Interview.find({
		user_id: userId,
		is_deleted: false,
	}).sort({ createdAt: -1 });
};

const getInterviewForApplication = async (applicationId) => {
	return Interview.findOne({
		application_id: applicationId,
		is_deleted: false,
		status: { $nin: ["expired", "cancelled"] },
	});
};

module.exports = {
	createInterview,
	getInterviewByToken,
	getInterviewById,
	getInterviewsForCandidate,
	getInterviewForApplication,
};
