const User = require("../../../models/user.schema");
const { generateToken } = require("../../../utils/jwt");

/**
 * Register a new user with email and password
 * @param {String} email - User email
 * @param {String} password - User password
 * @param {String} role - User role (recruiter or candidate)
 * @returns {Object} Auth payload with token and user
 */
const register = async (email, password, role) => {
	// Check if user already exists
	const existingUser = await User.findOne({ email, is_deleted: false });
	if (existingUser) {
		throw new Error("User with this email already exists");
	}

	// Create new user
	const user = new User({
		email,
		password,
		role,
		is_admin: false,
		is_deleted: false,
	});

	// Hash password is handled by pre-save hook
	await user.save();

	// Generate token
	const token = generateToken({
		userId: user._id.toString(),
		email: user.email,
	});

	return {
		token,
		user: {
			id: user._id.toString(),
			email: user.email,
			role: user.role,
			is_admin: user.is_admin,
			is_deleted: user.is_deleted,
			createdAt: user.createdAt.toISOString(),
			updatedAt: user.updatedAt.toISOString(),
		},
	};
};

/**
 * Login user with email and password
 * @param {String} email - User email
 * @param {String} password - User password
 * @returns {Object} Auth payload with token and user
 */
const login = async (email, password) => {
	// Find user
	const user = await User.findOne({ email, is_deleted: false });
	if (!user) {
		throw new Error("Invalid email or password");
	}

	// Check if user has password
	if (!user.password) {
		throw new Error("Invalid email or password");
	}

	// Verify password
	const isPasswordValid = await user.comparePassword(password);
	if (!isPasswordValid) {
		throw new Error("Invalid email or password");
	}

	// Generate token
	const token = generateToken({
		userId: user._id.toString(),
		email: user.email,
	});

	return {
		token,
		user: {
			id: user._id.toString(),
			email: user.email,
			role: user.role,
			is_admin: user.is_admin,
			is_deleted: user.is_deleted,
			createdAt: user.createdAt.toISOString(),
			updatedAt: user.updatedAt.toISOString(),
		},
	};
};

module.exports = {
	register,
	login,
};
