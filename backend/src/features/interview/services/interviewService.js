const Interview = require("../../../models/interview.schema");
const Application = require("../../../models/application.schema");
const Candidate = require("../../../models/candidate.schema");
const Recruiter = require("../../../models/recruiter.schema");
const Job = require("../../../models/job.schema");

/**
 * Recruiter sends an AI interview to a candidate for a specific application.
 */
const sendAiInterview = async (recruiterId, { application_id }) => {
	const recruiter = await Recruiter.findOne({ user_id: recruiterId, is_deleted: false });
	if (!recruiter) throw new Error("Recruiter profile not found");

	const application = await Application.findOne({ _id: application_id, is_deleted: false });
	if (!application) throw new Error("Application not found");

	const job = await Job.findOne({
		_id: application.job_id,
		recruiter_id: recruiter._id.toString(),
		is_deleted: false,
	});
	if (!job) throw new Error("You don't have permission to send interviews for this job");

	const existing = await Interview.findOne({
		application_id,
		is_deleted: false,
		status: { $nin: ["expired", "cancelled"] },
	});
	if (existing) return existing;

	const candidate = await Candidate.findOne({
		_id: application.candidate_id,
		is_deleted: false,
	});

	const interview = new Interview({
		application_id,
		candidate_id: application.candidate_id,
		user_id: application.user_id,
		job_id: application.job_id,
		resume_text: "",
		resume_url: candidate?.resume_url || application.resume_url || "",
		job_title: job.title,
		job_description: job.description,
	});

	await interview.save();
	return interview;
};

/**
 * Candidate fetches their interviews.
 */
const getMyInterviews = async (userId) => {
	return Interview.find({ user_id: userId, is_deleted: false }).sort({ createdAt: -1 });
};

/**
 * Get interview for a specific application (for candidates checking their interview status).
 */
const getInterviewForApplication = async (applicationId) => {
	return Interview.findOne({
		application_id: applicationId,
		is_deleted: false,
		status: { $nin: ["expired", "cancelled"] },
	});
};

/**
 * Recruiter checks interview status for an application.
 */
const getInterviewForApplicationAsRecruiter = async (recruiterId, applicationId) => {
	const recruiter = await Recruiter.findOne({ user_id: recruiterId, is_deleted: false });
	if (!recruiter) return null;

	const application = await Application.findOne({ _id: applicationId, is_deleted: false });
	if (!application) return null;

	const job = await Job.findOne({
		_id: application.job_id,
		recruiter_id: recruiter._id.toString(),
		is_deleted: false,
	});
	if (!job) return null;

	return Interview.findOne({
		application_id: applicationId,
		is_deleted: false,
		status: { $nin: ["expired", "cancelled"] },
	});
};

/**
 * Recruiter releases interview results so the candidate can see their scores.
 */
const releaseResults = async (recruiterId, interviewId) => {
	const recruiter = await Recruiter.findOne({ user_id: recruiterId, is_deleted: false });
	if (!recruiter) throw new Error("Recruiter profile not found");

	const interview = await Interview.findOne({ _id: interviewId, is_deleted: false });
	if (!interview) throw new Error("Interview not found");

	const application = await Application.findOne({ _id: interview.application_id, is_deleted: false });
	if (!application) throw new Error("Application not found");

	const job = await Job.findOne({
		_id: application.job_id,
		recruiter_id: recruiter._id.toString(),
		is_deleted: false,
	});
	if (!job) throw new Error("You don't have permission to release results for this interview");

	if (interview.status !== "completed") {
		throw new Error("Can only release results for completed interviews");
	}

	interview.results_released = true;
	await interview.save();
	return interview;
};

module.exports = {
	sendAiInterview,
	getMyInterviews,
	getInterviewForApplication,
	getInterviewForApplicationAsRecruiter,
	releaseResults,
};
