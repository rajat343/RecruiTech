const Job = require("../../../models/job.schema");
const Recruiter = require("../../../models/recruiter.schema");
const User = require("../../../models/user.schema");
const Company = require("../../../models/company.schema");
const Application = require("../../../models/application.schema");

const createJob = async (jobData, userId) => {
  const user = await User.findById(userId);
  if (!user || user.is_deleted) throw new Error("User not found");
  if (user.role !== "recruiter") throw new Error("User must have recruiter role");

  const recruiter = await Recruiter.findOne({ user_id: userId, is_deleted: false });
  if (!recruiter) throw new Error("Recruiter profile not found");

  const companyId = jobData.company_id || recruiter.company_id;
  if (!companyId) throw new Error("Company id missing");

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

const getAllJobs = async ({ limit = 10, offset = 0 }) => {
  return await Job.find({ is_deleted: false, is_active: true })
    .limit(parseInt(limit))
    .skip(parseInt(offset))
    .sort({ createdAt: -1 });
};

const getJobById = async (jobId) => {
  return Job.findOne({ _id: jobId, is_deleted: false });
};

const searchJobs = async (filters = {}, { limit = 20, offset = 0 }) => {
  const query = { is_deleted: false, is_active: true };

  if (filters.search) {
    const tokens = filters.search
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (tokens.length > 0) {
      // Require ALL tokens to be present in either title, description, or location
      query.$and = tokens.map((token) => {
        const regex = new RegExp(token, "i");
        return {
          $or: [
            { title: regex },
            { description: regex },
            { location: regex },
          ],
        };
      });
    }
  }

  if (filters.employment_type) {
    query.employment_type = filters.employment_type;
  }

  if (filters.experience_level) {
    query.experience_level = filters.experience_level;
  }

  if (filters.location_type) {
    query.location_type = filters.location_type;
  }

  if (filters.skills && filters.skills.length > 0) {
    query.skills = { $in: filters.skills.map((s) => new RegExp(s, "i")) };
  }

  const [jobs, total] = await Promise.all([
    Job.find(query)
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .sort({ createdAt: -1 }),
    Job.countDocuments(query),
  ]);

  return { jobs, total };
};

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

const resolveCompanyName = async (companyId) => {
  if (!companyId) return null;
  const company = await Company.findById(companyId);
  return company ? company.name : null;
};

const resolveApplicationCount = async (jobId) => {
  return Application.countDocuments({ job_id: jobId, is_deleted: false });
};

module.exports = {
  createJob,
  getAllJobs,
  getJobById,
  searchJobs,
  getMyJobPosts,
  resolveCompanyName,
  resolveApplicationCount,
};
