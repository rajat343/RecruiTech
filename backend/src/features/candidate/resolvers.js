const { requireAuth } = require("../../middleware/auth");
const candidateService = require("./services/candidateService");

const candidateResolvers = {
	Query: {
		candidate: async (parent, { id }, context) => {
			requireAuth(context);
			const candidate = await candidateService.getCandidateById(id);
			return {
				id: candidate._id.toString(),
				first_name: candidate.first_name,
				last_name: candidate.last_name,
				full_name: candidate.full_name,
				email: candidate.email,
				contact_number: candidate.contact_number,
				github_url: candidate.github_url,
				leetcode_url: candidate.leetcode_url,
				portfolio_url: candidate.portfolio_url,
				resume_url: candidate.resume_url,
				profile_summary: candidate.profile_summary,
				status: candidate.status,
				is_deleted: candidate.is_deleted,
				user_id: candidate.user_id.toString(),
				createdAt: candidate.createdAt.toISOString(),
				updatedAt: candidate.updatedAt.toISOString(),
			};
		},

		myCandidateProfile: async (parent, args, context) => {
			const user = requireAuth(context);
			const candidate = await candidateService.getCandidateByUserId(
				user._id.toString()
			);
			return {
				id: candidate._id.toString(),
				first_name: candidate.first_name,
				last_name: candidate.last_name,
				full_name: candidate.full_name,
				email: candidate.email,
				contact_number: candidate.contact_number,
				github_url: candidate.github_url,
				leetcode_url: candidate.leetcode_url,
				portfolio_url: candidate.portfolio_url,
				resume_url: candidate.resume_url,
				profile_summary: candidate.profile_summary,
				status: candidate.status,
				is_deleted: candidate.is_deleted,
				user_id: candidate.user_id.toString(),
				createdAt: candidate.createdAt.toISOString(),
				updatedAt: candidate.updatedAt.toISOString(),
			};
		},

		candidates: async (parent, { status, limit, offset }, context) => {
			requireAuth(context);
			const candidates = await candidateService.getCandidates({
				status,
				limit,
				offset,
			});
			return candidates.map((candidate) => ({
				id: candidate._id.toString(),
				first_name: candidate.first_name,
				last_name: candidate.last_name,
				full_name: candidate.full_name,
				email: candidate.email,
				contact_number: candidate.contact_number,
				github_url: candidate.github_url,
				leetcode_url: candidate.leetcode_url,
				portfolio_url: candidate.portfolio_url,
				resume_url: candidate.resume_url,
				profile_summary: candidate.profile_summary,
				status: candidate.status,
				is_deleted: candidate.is_deleted,
				user_id: candidate.user_id.toString(),
				createdAt: candidate.createdAt.toISOString(),
				updatedAt: candidate.updatedAt.toISOString(),
			}));
		},
	},

	Mutation: {
		createCandidate: async (parent, { input }, context) => {
			const user = requireAuth(context);
			const candidate = await candidateService.createCandidate(
				input,
				user._id.toString()
			);
			return {
				id: candidate._id.toString(),
				first_name: candidate.first_name,
				last_name: candidate.last_name,
				full_name: candidate.full_name,
				email: candidate.email,
				contact_number: candidate.contact_number,
				github_url: candidate.github_url,
				leetcode_url: candidate.leetcode_url,
				portfolio_url: candidate.portfolio_url,
				resume_url: candidate.resume_url,
				profile_summary: candidate.profile_summary,
				status: candidate.status,
				is_deleted: candidate.is_deleted,
				user_id: candidate.user_id.toString(),
				createdAt: candidate.createdAt.toISOString(),
				updatedAt: candidate.updatedAt.toISOString(),
			};
		},

		updateCandidate: async (parent, { id, input }, context) => {
			const user = requireAuth(context);
			const candidate = await candidateService.updateCandidate(
				id,
				input,
				user._id.toString()
			);
			return {
				id: candidate._id.toString(),
				first_name: candidate.first_name,
				last_name: candidate.last_name,
				full_name: candidate.full_name,
				email: candidate.email,
				contact_number: candidate.contact_number,
				github_url: candidate.github_url,
				leetcode_url: candidate.leetcode_url,
				portfolio_url: candidate.portfolio_url,
				resume_url: candidate.resume_url,
				profile_summary: candidate.profile_summary,
				status: candidate.status,
				is_deleted: candidate.is_deleted,
				user_id: candidate.user_id.toString(),
				createdAt: candidate.createdAt.toISOString(),
				updatedAt: candidate.updatedAt.toISOString(),
			};
		},

		deleteCandidate: async (parent, { id }, context) => {
			const user = requireAuth(context);
			return await candidateService.deleteCandidate(
				id,
				user._id.toString()
			);
		},
	},
};

module.exports = candidateResolvers;
