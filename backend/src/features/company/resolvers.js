const { requireAuth } = require("../../middleware/auth");
const companyService = require("./services/companyService");

const companyResolvers = {
	Query: {
		company: async (parent, { id }, context) => {
			requireAuth(context);
			const company = await companyService.getCompanyById(id);
			return {
				id: company._id.toString(),
				name: company.name,
				domain: company.domain,
				is_verified: company.is_verified,
				is_deleted: company.is_deleted,
				created_by: company.created_by.toString(),
				createdAt: company.createdAt.toISOString(),
				updatedAt: company.updatedAt.toISOString(),
			};
		},

		companies: async (parent, { search, limit, offset }, context) => {
			requireAuth(context);
			const companies = await companyService.getCompanies({
				search,
				limit,
				offset,
			});
			return companies.map((company) => ({
				id: company._id.toString(),
				name: company.name,
				domain: company.domain,
				is_verified: company.is_verified,
				is_deleted: company.is_deleted,
				created_by: company.created_by.toString(),
				createdAt: company.createdAt.toISOString(),
				updatedAt: company.updatedAt.toISOString(),
			}));
		},
	},

	Mutation: {
		createCompany: async (parent, { input }, context) => {
			const user = requireAuth(context);
			const company = await companyService.createCompany(
				input,
				user._id.toString()
			);
			return {
				id: company._id.toString(),
				name: company.name,
				domain: company.domain,
				is_verified: company.is_verified,
				is_deleted: company.is_deleted,
				created_by: company.created_by.toString(),
				createdAt: company.createdAt.toISOString(),
				updatedAt: company.updatedAt.toISOString(),
			};
		},

		updateCompany: async (parent, { id, input }, context) => {
			const user = requireAuth(context);
			const company = await companyService.updateCompany(
				id,
				input,
				user._id.toString()
			);
			return {
				id: company._id.toString(),
				name: company.name,
				domain: company.domain,
				is_verified: company.is_verified,
				is_deleted: company.is_deleted,
				created_by: company.created_by.toString(),
				createdAt: company.createdAt.toISOString(),
				updatedAt: company.updatedAt.toISOString(),
			};
		},

		deleteCompany: async (parent, { id }, context) => {
			const user = requireAuth(context);
			return await companyService.deleteCompany(id, user._id.toString());
		},
	},
};

module.exports = companyResolvers;
