const { requireAuth, requireAdmin } = require("../../middleware/auth");
const jobService = require("./services/jobService");
const jobSearchService = require("./services/jobSearchService");

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

    // Advanced job search with Elasticsearch
    searchJobs: async (parent, { filters }, context) => {
      // Public search (no auth required for candidates to search jobs)
      const results = await jobSearchService.searchJobs(filters);
      return results;
    },

    // Job suggestions for autocomplete
    jobSuggestions: async (parent, { query, field }, context) => {
      const suggestions = await jobSearchService.getJobSuggestions(query, field || 'title');
      return suggestions;
    },

    // Get single job by ID
    job: async (parent, { id }, context) => {
      const job = await jobService.getJobById(id);
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

    // Update job
    updateJob: async (parent, { id, input }, context) => {
      const user = requireAuth(context);
      const job = await jobService.updateJob(id, input, user._id.toString());
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

    // Delete job
    deleteJob: async (parent, { id }, context) => {
      const user = requireAuth(context);
      return await jobService.deleteJob(id, user._id.toString());
    },

    // Elasticsearch management (admin only)
    reindexAllJobs: async (parent, args, context) => {
      //requireAdmin(context);
      const success = await jobSearchService.reindexAllJobs();
      return success;
    },
  },
};

module.exports = jobResolvers;
