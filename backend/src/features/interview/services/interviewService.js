const Interview = require("../../../models/interview.schema");
const Application = require("../../../models/application.schema");
const Candidate = require("../../../models/candidate.schema");
const Recruiter = require("../../../models/recruiter.schema");
const Job = require("../../../models/job.schema");
const {
	createInterviewSessionGrpc,
} = require("../../../clients/interviewControlGrpc");

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

	const mongoose = require("mongoose");
	const evaluation = await mongoose.connection.db.collection("evaluations").findOne(
		{
			candidate_id: String(application.candidate_id),
			job_id: String(application.job_id),
		},
		{ sort: { created_at: -1 } }
	);

	const grpcRes = await createInterviewSessionGrpc({
		application_id: String(application_id),
		candidate_id: String(application.candidate_id),
		user_id: String(application.user_id),
		job_id: String(application.job_id),
		resume_text: "",
		resume_url: candidate?.resume_url || application.resume_url || "",
		job_title: job.title,
		job_description: job.description,
		interview_focus_areas: evaluation?.interview_focus_areas || [],
		strength_tags: evaluation?.strength_tags || [],
	});

	if (!grpcRes.ok) {
		throw new Error(
			grpcRes.error_message || "interview-service gRPC create failed",
		);
	}

	const created = await Interview.findById(grpcRes.interview_id);
	if (!created) {
		throw new Error("Interview created via gRPC but not found in DB");
	}
	return created;
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
