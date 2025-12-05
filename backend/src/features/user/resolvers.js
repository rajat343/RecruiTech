const { requireAuth, requireAdmin } = require("../../middleware/auth");
const authService = require("./services/authService");
const userService = require("./services/userService");
const { GraphQLJSON } = require("graphql-type-json");

const userResolvers = {
	JSON: GraphQLJSON,

	Query: {
		me: async (parent, args, context) => {
			const user = requireAuth(context);
			return {
				id: user._id.toString(),
				email: user.email,
				role: user.role,
				profile_pic: user?.profile_pic,
				is_admin: user.is_admin,
				admin_metadata: user?.admin_metadata,
				metadata: user?.metadata,
				is_deleted: user.is_deleted,
				createdAt: user.createdAt.toISOString(),
				updatedAt: user.updatedAt.toISOString(),
			};
		},

		user: async (parent, { id }, context) => {
			requireAuth(context);
			const user = await userService.getUserById(id);
			return {
				id: user._id.toString(),
				email: user.email,
				role: user.role,
				profile_pic: user?.profile_pic,
				is_admin: user.is_admin,
				admin_metadata: user?.admin_metadata,
				metadata: user?.metadata,
				is_deleted: user.is_deleted,
				createdAt: user.createdAt.toISOString(),
				updatedAt: user.updatedAt.toISOString(),
			};
		},

		users: async (parent, { role, limit, offset }, context) => {
			requireAuth(context);
			const users = await userService.getUsers({ role, limit, offset });
			return users.map((user) => ({
				id: user._id.toString(),
				email: user.email,
				role: user.role,
				profile_pic: user?.profile_pic,
				is_admin: user.is_admin,
				admin_metadata: user?.admin_metadata,
				metadata: user?.metadata,
				is_deleted: user.is_deleted,
				createdAt: user.createdAt.toISOString(),
				updatedAt: user.updatedAt.toISOString(),
			}));
		},
	},

	Mutation: {
		register: async (parent, { email, password, role }) => {
			return await authService.register(email, password, role);
		},

		login: async (parent, { email, password }) => {
			return await authService.login(email, password);
		},

		updateUserRole: async (parent, { id, role }, context) => {
			requireAdmin(context);
			const user = await userService.updateUserRole(id, role);
			return {
				id: user._id.toString(),
				email: user.email,
				role: user.role,
				profile_pic: user?.profile_pic,
				is_admin: user.is_admin,
				admin_metadata: user?.admin_metadata,
				metadata: user?.metadata,
				is_deleted: user.is_deleted,
				createdAt: user.createdAt.toISOString(),
				updatedAt: user.updatedAt.toISOString(),
			};
		},

		deleteUser: async (parent, { id }, context) => {
			requireAdmin(context);
			return await userService.deleteUser(id);
		},
	},
};

module.exports = userResolvers;
