const { requireAuth } = require("../../middleware/auth");
const jobService = require("./services/jobService");

const jobResolvers = {
  Query: {
    jobs: async (parent, { limit, offset }, context) => {
      // Public listing (no auth required)
      const jobs = await jobService.getAllJobs({ limit, offset });
      return jobs.map((job) => ({
        id: job._id.toString(),
        recruiter_id: job.recruiter_id,
        company_id: job.company_id,
        title: job.title,
        description: job.description,
        employment_type: job.employment_type,
        experience_level: job.experience_level,
        location_type: job.location_type,
        location: job.location,
        salary_min: job.salary_min,
        salary_max: job.salary_max,
        salary_currency: job.salary_currency,
        skills: job.skills,
        apply_url: job.apply_url,
        is_active: job.is_active,
        is_deleted: job.is_deleted,
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString(),
      }));
    },
    myJobPosts: async (parent, { limit, offset }, context) => {
      const user = requireAuth(context);
      const jobs = await jobService.getMyJobPosts(user._id.toString(), { limit, offset });
      return jobs.map((job) => ({
        id: job._id.toString(),
        recruiter_id: job.recruiter_id,
        company_id: job.company_id,
        title: job.title,
        description: job.description,
        employment_type: job.employment_type,
        experience_level: job.experience_level,
        location_type: job.location_type,
        location: job.location,
        salary_min: job.salary_min,
        salary_max: job.salary_max,
        salary_currency: job.salary_currency,
        skills: job.skills,
        apply_url: job.apply_url,
        is_active: job.is_active,
        is_deleted: job.is_deleted,
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString(),
      }));
    },
  },
  Mutation: {
    createJob: async (parent, { input }, context) => {
      const user = requireAuth(context);
      const job = await jobService.createJob(input, user._id.toString());
      return {
        id: job._id.toString(),
        recruiter_id: job.recruiter_id,
        company_id: job.company_id,
        title: job.title,
        description: job.description,
        employment_type: job.employment_type,
        experience_level: job.experience_level,
        location_type: job.location_type,
        location: job.location,
        salary_min: job.salary_min,
        salary_max: job.salary_max,
        salary_currency: job.salary_currency,
        skills: job.skills,
        apply_url: job.apply_url,
        is_active: job.is_active,
        is_deleted: job.is_deleted,
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString(),
      };
    },
  },
};

module.exports = jobResolvers;
