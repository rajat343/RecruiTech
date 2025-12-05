const User = require("../../../models/user.schema");

const getSingleUser = async (query) => {
	const user = await User.findOne(query);
	return user;
};

const getUserById = async (userId) => {
	const user = await User.findById(userId);
	if (!user || user.is_deleted) {
		throw new Error("User not found");
	}
	return user;
};

const getUserByEmail = async (email) => {
	const user = await User.findOne({ email, is_deleted: false });
	if (!user) {
		throw new Error("User not found");
	}
	return user;
};

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

const deleteUser = async (userId) => {
	const user = await User.findById(userId);
	if (!user || user.is_deleted) {
		throw new Error("User not found");
	}
	user.is_deleted = true;
	await user.save();
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
