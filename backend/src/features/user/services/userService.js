const User = require("../../../models/user.schema");

/**
 * Get single user by query object
 * @param {Object} query - Query object (e.g., { _id: userId }, { google_id: id, is_deleted: false })
 * @returns {Object|null} User object or null if not found
 */
const getSingleUser = async (query) => {
	const user = await User.findOne(query);
	return user;
};

/**
 * Get user by ID
 * @param {String} userId - User ID
 * @returns {Object} User object
 */
const getUserById = async (userId) => {
	const user = await User.findById(userId);
	if (!user || user.is_deleted) {
		throw new Error("User not found");
	}
	return user;
};

/**
 * Get user by email
 * @param {String} email - User email
 * @returns {Object} User object
 */
const getUserByEmail = async (email) => {
	const user = await User.findOne({ email, is_deleted: false });
	if (!user) {
		throw new Error("User not found");
	}
	return user;
};

/**
 * Get all users with optional filters
 * @param {Object} filters - Filter options (role, limit, offset)
 * @returns {Array} Array of users
 */
const getUsers = async ({ role, limit = 10, offset = 0 }) => {
	const query = { is_deleted: false };
	if (role) {
		query.role = role;
	}

	const users = await User.find(query)
		.limit(parseInt(limit))
		.skip(parseInt(offset))
		.sort({ createdAt: -1 });

	return users;
};

/**
 * Update user role
 * @param {String} userId - User ID
 * @param {String} role - New role
 * @returns {Object} Updated user
 */
const updateUserRole = async (userId, role) => {
	const user = await User.findById(userId);
	if (!user || user.is_deleted) {
		throw new Error("User not found");
	}

	if (!["recruiter", "candidate"].includes(role)) {
		throw new Error("Invalid role");
	}

	user.role = role;
	await user.save();

	return user;
};

/**
 * Soft delete user
 * @param {String} userId - User ID
 * @returns {Boolean} Success status
 */
const deleteUser = async (userId) => {
	const user = await User.findById(userId);
	if (!user || user.is_deleted) {
		throw new Error("User not found");
	}

	await user.softDelete();
	return true;
};

module.exports = {
	getSingleUser,
	getUserById,
	getUserByEmail,
	getUsers,
	updateUserRole,
	deleteUser,
};
