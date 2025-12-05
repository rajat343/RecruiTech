const { requireAuth, requireAdmin } = require("../../middleware/auth");
const recruiterService = require("./services/recruiterService");

const recruiterResolvers = {
	Query: {
		recruiter: async (parent, { id }, context) => {
			requireAuth(context);
			const recruiter = await recruiterService.getRecruiterById(id);
			return {
				id: recruiter._id.toString(),
				first_name: recruiter.first_name,
				last_name: recruiter.last_name,
				email: recruiter.email,
				phone_number: recruiter.phone_number,
				company_id: recruiter.company_id.toString(),
				verification_status: recruiter.verification_status,
				is_deleted: recruiter.is_deleted,
				user_id: recruiter.user_id.toString(),
				createdAt: recruiter.createdAt.toISOString(),
				updatedAt: recruiter.updatedAt.toISOString(),
			};
		},

		myRecruiterProfile: async (parent, args, context) => {
			const user = requireAuth(context);
			const recruiter = await recruiterService.getRecruiterByUserId(
				user._id.toString()
			);
			return {
				id: recruiter._id.toString(),
				first_name: recruiter.first_name,
				last_name: recruiter.last_name,
				email: recruiter.email,
				phone_number: recruiter.phone_number,
				company_id: recruiter.company_id.toString(),
				verification_status: recruiter.verification_status,
				is_deleted: recruiter.is_deleted,
				user_id: recruiter.user_id.toString(),
				createdAt: recruiter.createdAt.toISOString(),
				updatedAt: recruiter.updatedAt.toISOString(),
			};
		},

		recruiters: async (
			parent,
			{ verification_status, limit, offset },
			context
		) => {
			requireAuth(context);
			const recruiters = await recruiterService.getRecruiters({
				verification_status,
				limit,
				offset,
			});
			return recruiters.map((recruiter) => ({
				id: recruiter._id.toString(),
				first_name: recruiter.first_name,
				last_name: recruiter.last_name,
				email: recruiter.email,
				phone_number: recruiter.phone_number,
				company_id: recruiter.company_id.toString(),
				verification_status: recruiter.verification_status,
				is_deleted: recruiter.is_deleted,
				user_id: recruiter.user_id.toString(),
				createdAt: recruiter.createdAt.toISOString(),
				updatedAt: recruiter.updatedAt.toISOString(),
			}));
		},
	},

	Mutation: {
		createRecruiter: async (parent, { input }, context) => {
			const user = requireAuth(context);
			const recruiter = await recruiterService.createRecruiter(
				input,
				user._id.toString()
			);
			return {
				id: recruiter._id.toString(),
				first_name: recruiter.first_name,
				last_name: recruiter.last_name,
				email: recruiter.email,
				phone_number: recruiter.phone_number,
				company_id: recruiter.company_id.toString(),
				verification_status: recruiter.verification_status,
				is_deleted: recruiter.is_deleted,
				user_id: recruiter.user_id.toString(),
				createdAt: recruiter.createdAt.toISOString(),
				updatedAt: recruiter.updatedAt.toISOString(),
			};
		},

		updateRecruiter: async (parent, { id, input }, context) => {
			const user = requireAuth(context);
			const recruiter = await recruiterService.updateRecruiter(
				id,
				input,
				user._id.toString()
			);
			return {
				id: recruiter._id.toString(),
				first_name: recruiter.first_name,
				last_name: recruiter.last_name,
				email: recruiter.email,
				phone_number: recruiter.phone_number,
				company_id: recruiter.company_id.toString(),
				verification_status: recruiter.verification_status,
				is_deleted: recruiter.is_deleted,
				user_id: recruiter.user_id.toString(),
				createdAt: recruiter.createdAt.toISOString(),
				updatedAt: recruiter.updatedAt.toISOString(),
			};
		},

		deleteRecruiter: async (parent, { id }, context) => {
			const user = requireAuth(context);
			return await recruiterService.deleteRecruiter(
				id,
				user._id.toString()
			);
		},

		updateRecruiterVerification: async (
			parent,
			{ id, verification_status },
			context
		) => {
			requireAdmin(context);
			const recruiter =
				await recruiterService.updateRecruiterVerification(
					id,
					verification_status
				);
			return {
				id: recruiter._id.toString(),
				first_name: recruiter.first_name,
				last_name: recruiter.last_name,
				email: recruiter.email,
				phone_number: recruiter.phone_number,
				company_id: recruiter.company_id.toString(),
				verification_status: recruiter.verification_status,
				is_deleted: recruiter.is_deleted,
				user_id: recruiter.user_id.toString(),
				createdAt: recruiter.createdAt.toISOString(),
				updatedAt: recruiter.updatedAt.toISOString(),
			};
		},
	},
};

module.exports = recruiterResolvers;
