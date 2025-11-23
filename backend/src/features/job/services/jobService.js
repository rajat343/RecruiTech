const Job = require("../../../models/job.schema");
const Recruiter = require("../../../models/recruiter.schema");
const User = require("../../../models/user.schema");

/**
 * Create a new job posting
 * @param {Object} jobData
 * @param {String} userId - Authenticated user id
 * @returns {Object} Created Job
 */
const createJob = async (jobData, userId) => {
  // Verify user exists and has recruiter role
  const user = await User.findById(userId);
  if (!user || user.is_deleted) throw new Error("User not found");
  if (user.role !== "recruiter") throw new Error("User must have recruiter role");

  // Get recruiter profile
  const recruiter = await Recruiter.findOne({ user_id: userId, is_deleted: false });
  if (!recruiter) throw new Error("Recruiter profile not found");

  // Prepare company id (from recruiter unless explicitly provided)
  const companyId = jobData.company_id || recruiter.company_id;
  if (!companyId) throw new Error("Company id missing");

  // Basic validations
  if (jobData.salary_min && jobData.salary_max && jobData.salary_min > jobData.salary_max) {
    throw new Error("salary_min cannot be greater than salary_max");
  }

  const job = new Job({
    ...jobData,
    company_id: companyId,
    recruiter_id: recruiter._id.toString(),
    skills: jobData.skills || [],
    salary_currency: jobData.salary_currency || "USD",
  });

  await job.save();
  return job;
};

/**
 * Fetch all active jobs (no filters) with pagination
 * @param {Number} limit
 * @param {Number} offset
 * @returns {Array<Job>}
 */
const getAllJobs = async ({ limit = 10, offset = 0 }) => {
  return await Job.find({ is_deleted: false, is_active: true })
    .limit(parseInt(limit))
    .skip(parseInt(offset))
    .sort({ createdAt: -1 });
};

/**
 * Fetch jobs posted by authenticated recruiter
 * @param {String} userId
 * @param {Number} limit
 * @param {Number} offset
 * @returns {Array<Job>}
 */
const getMyJobPosts = async (userId, { limit = 10, offset = 0 }) => {
  const recruiter = await Recruiter.findOne({ user_id: userId, is_deleted: false });
  if (!recruiter) throw new Error("Recruiter profile not found");

  const jobs = await Job.find({
    recruiter_id: recruiter._id.toString(),
    is_deleted: false,
  })
    .limit(parseInt(limit))
    .skip(parseInt(offset))
    .sort({ createdAt: -1 });
  return jobs;
};

module.exports = { createJob, getAllJobs, getMyJobPosts };
