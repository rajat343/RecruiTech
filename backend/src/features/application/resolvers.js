const { requireAuth } = require("../../middleware/auth");
const applicationService = require("./services/applicationService");
const Job = require("../../models/job.schema");
const Candidate = require("../../models/candidate.schema");

const formatApplication = (app) => ({
  id: app._id.toString(),
  job_id: app.job_id,
  candidate_id: app.candidate_id,
  user_id: app.user_id,
  status: app.status,
  cover_letter: app.cover_letter,
  resume_url: app.resume_url,
  is_deleted: app.is_deleted,
  createdAt: app.createdAt.toISOString(),
  updatedAt: app.updatedAt.toISOString(),
});

const applicationResolvers = {
  Application: {
    job: async (parent) => {
      const job = await Job.findById(parent.job_id);
      if (!job) return null;
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
    candidate: async (parent) => {
      const candidate = await Candidate.findById(parent.candidate_id);
      if (!candidate) return null;
      return {
        id: candidate._id.toString(),
        user_id: candidate.user_id,
        first_name: candidate.first_name,
        last_name: candidate.last_name,
        email: candidate.email,
        phone_number: candidate.phone_number,
        resume_url: candidate.resume_url,
        location_city: candidate.location_city,
        location_state: candidate.location_state,
        location_country: candidate.location_country,
        linkedin_url: candidate.linkedin_url,
        github_url: candidate.github_url,
        portfolio_url: candidate.portfolio_url,
        skills: candidate.skills,
        profile_summary: candidate.profile_summary,
        status: candidate.status,
      };
    },
  },
  Query: {
    myApplications: async (_, { limit, offset }, context) => {
      const user = requireAuth(context);
      const apps = await applicationService.getMyApplications(user._id.toString(), {
        limit,
        offset,
      });
      return apps.map(formatApplication);
    },
    applicationsForJob: async (_, { job_id, limit, offset }, context) => {
      const user = requireAuth(context);
      const apps = await applicationService.getApplicationsForJob(
        user._id.toString(),
        job_id,
        { limit, offset }
      );
      return apps.map(formatApplication);
    },
    applicationCountForJob: async (_, { job_id }, context) => {
      requireAuth(context);
      return applicationService.getApplicationCountForJob(job_id);
    },
    myApplicationCount: async (_, __, context) => {
      const user = requireAuth(context);
      return applicationService.getMyApplicationCount(user._id.toString());
    },
    hasApplied: async (_, { job_id }, context) => {
      const user = requireAuth(context);
      return applicationService.hasApplied(user._id.toString(), job_id);
    },
  },
  Mutation: {
    applyToJob: async (_, { input }, context) => {
      const user = requireAuth(context);
      const app = await applicationService.applyToJob(user._id.toString(), input);
      return formatApplication(app);
    },
    updateApplicationStatus: async (_, { id, status }, context) => {
      const user = requireAuth(context);
      const app = await applicationService.updateApplicationStatus(
        user._id.toString(),
        id,
        status
      );
      return formatApplication(app);
    },
    withdrawApplication: async (_, { id }, context) => {
      const user = requireAuth(context);
      const app = await applicationService.withdrawApplication(user._id.toString(), id);
      return formatApplication(app);
    },
  },
};

module.exports = applicationResolvers;
