const Application = require("../../../models/application.schema");
const Candidate = require("../../../models/candidate.schema");
const Job = require("../../../models/job.schema");
const User = require("../../../models/user.schema");
const Recruiter = require("../../../models/recruiter.schema");

const applyToJob = async (userId, { job_id, cover_letter, resume_url }) => {
  const user = await User.findById(userId);
  if (!user || user.is_deleted) throw new Error("User not found");
  if (user.role !== "candidate") throw new Error("Only candidates can apply to jobs");

  const candidate = await Candidate.findOne({ user_id: userId, is_deleted: false });
  if (!candidate) throw new Error("Candidate profile not found. Complete your profile first.");

  const job = await Job.findOne({ _id: job_id, is_deleted: false, is_active: true });
  if (!job) throw new Error("Job not found or no longer active");

  const existing = await Application.findOne({
    job_id,
    candidate_id: candidate._id.toString(),
    is_deleted: false,
  });
  if (existing) throw new Error("You have already applied to this job");

  const application = new Application({
    job_id,
    candidate_id: candidate._id.toString(),
    user_id: userId,
    cover_letter: cover_letter || null,
    resume_url: resume_url || candidate.resume_url || null,
    status: "pending",
  });

  await application.save();
  return application;
};

const getMyApplications = async (userId, { limit = 20, offset = 0 }) => {
  const candidate = await Candidate.findOne({ user_id: userId, is_deleted: false });
  if (!candidate) throw new Error("Candidate profile not found");

  return Application.find({
    candidate_id: candidate._id.toString(),
    is_deleted: false,
  })
    .limit(parseInt(limit))
    .skip(parseInt(offset))
    .sort({ createdAt: -1 });
};

const getApplicationsForJob = async (userId, jobId, { limit = 50, offset = 0 }) => {
  const recruiter = await Recruiter.findOne({ user_id: userId, is_deleted: false });
  if (!recruiter) throw new Error("Recruiter profile not found");

  const job = await Job.findOne({
    _id: jobId,
    recruiter_id: recruiter._id.toString(),
    is_deleted: false,
  });
  if (!job) throw new Error("Job not found or you don't own this job");

  return Application.find({
    job_id: jobId,
    is_deleted: false,
  })
    .limit(parseInt(limit))
    .skip(parseInt(offset))
    .sort({ createdAt: -1 });
};

const updateApplicationStatus = async (userId, applicationId, status) => {
  const recruiter = await Recruiter.findOne({ user_id: userId, is_deleted: false });
  if (!recruiter) throw new Error("Recruiter profile not found");

  const application = await Application.findOne({ _id: applicationId, is_deleted: false });
  if (!application) throw new Error("Application not found");

  const job = await Job.findOne({
    _id: application.job_id,
    recruiter_id: recruiter._id.toString(),
    is_deleted: false,
  });
  if (!job) throw new Error("You don't have permission to update this application");

  application.status = status;
  await application.save();
  return application;
};

const withdrawApplication = async (userId, applicationId) => {
  const candidate = await Candidate.findOne({ user_id: userId, is_deleted: false });
  if (!candidate) throw new Error("Candidate profile not found");

  const application = await Application.findOne({
    _id: applicationId,
    candidate_id: candidate._id.toString(),
    is_deleted: false,
  });
  if (!application) throw new Error("Application not found");

  application.is_deleted = true;
  await application.save();
  return application;
};

const getApplicationCountForJob = async (jobId) => {
  return Application.countDocuments({ job_id: jobId, is_deleted: false });
};

const getMyApplicationCount = async (userId) => {
  const candidate = await Candidate.findOne({ user_id: userId, is_deleted: false });
  if (!candidate) return 0;
  return Application.countDocuments({
    candidate_id: candidate._id.toString(),
    is_deleted: false,
  });
};

const hasApplied = async (userId, jobId) => {
  const candidate = await Candidate.findOne({ user_id: userId, is_deleted: false });
  if (!candidate) return false;
  const app = await Application.findOne({
    job_id: jobId,
    candidate_id: candidate._id.toString(),
    is_deleted: false,
  });
  return !!app;
};

module.exports = {
  applyToJob,
  getMyApplications,
  getApplicationsForJob,
  updateApplicationStatus,
  withdrawApplication,
  getApplicationCountForJob,
  getMyApplicationCount,
  hasApplied,
};
