const Job = require("../../../models/job.schema");
const Recruiter = require("../../../models/recruiter.schema");
const User = require("../../../models/user.schema");
const jobSearchService = require("./jobSearchService");

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
  
  // Index job in Elasticsearch (async, don't block on failure)
  setImmediate(() => {
    jobSearchService.indexJob(job);
  });
  
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

/**
 * Update job
 * @param {String} jobId - Job ID
 * @param {Object} updateData - Update data
 * @param {String} userId - User ID (for authorization)
 * @returns {Object} Updated job
 */
const updateJob = async (jobId, updateData, userId) => {
  const job = await Job.findById(jobId);
  if (!job || job.is_deleted) {
    throw new Error("Job not found");
  }

  const user = await User.findById(userId);
  if (!user || user.is_deleted) {
    throw new Error("User not found");
  }

  const recruiter = await Recruiter.findOne({ user_id: userId, is_deleted: false });
  if (!recruiter) {
    throw new Error("Recruiter profile not found");
  }

  // Check if user owns this job or is admin
  if (job.recruiter_id !== recruiter._id.toString() && !user.is_admin) {
    throw new Error("Unauthorized to update this job");
  }

  // Basic validations
  if (updateData.salary_min && updateData.salary_max && updateData.salary_min > updateData.salary_max) {
    throw new Error("salary_min cannot be greater than salary_max");
  }

  // Update fields
  Object.keys(updateData).forEach((key) => {
    if (updateData[key] !== undefined) {
      job[key] = updateData[key];
    }
  });

  await job.save();

  // Update job in Elasticsearch (async, don't block on failure)
  setImmediate(() => {
    jobSearchService.updateJobInIndex(job);
  });

  return job;
};

/**
 * Soft delete job
 * @param {String} jobId - Job ID
 * @param {String} userId - User ID (for authorization)
 * @returns {Boolean} Success status
 */
const deleteJob = async (jobId, userId) => {
  const job = await Job.findById(jobId);
  if (!job || job.is_deleted) {
    throw new Error("Job not found");
  }

  const user = await User.findById(userId);
  if (!user || user.is_deleted) {
    throw new Error("User not found");
  }

  const recruiter = await Recruiter.findOne({ user_id: userId, is_deleted: false });
  if (!recruiter) {
    throw new Error("Recruiter profile not found");
  }

  // Check if user owns this job or is admin
  if (job.recruiter_id !== recruiter._id.toString() && !user.is_admin) {
    throw new Error("Unauthorized to delete this job");
  }

  job.is_deleted = true;
  job.is_active = false;
  await job.save();

  // Remove job from Elasticsearch (async, don't block on failure)
  setImmediate(() => {
    jobSearchService.deleteJobFromIndex(jobId);
  });

  return true;
};

/**
 * Get job by ID
 * @param {String} jobId - Job ID
 * @returns {Object} Job object
 */
const getJobById = async (jobId) => {
  const job = await Job.findById(jobId);
  if (!job || job.is_deleted) {
    throw new Error("Job not found");
  }
  return job;
};

module.exports = { 
  createJob, 
  getAllJobs, 
  getMyJobPosts, 
  updateJob, 
  deleteJob, 
  getJobById 
};
