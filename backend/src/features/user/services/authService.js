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
		// Check if they signed up with OAuth
		if (existingUser.google_id && !existingUser.password) {
			throw new Error(
				"This email is already registered with Google. Please use Google Sign In."
			);
		}
		throw new Error(
			"An account with this email already exists. Please log in."
		);
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
			profile_pic: user?.profile_pic,
			is_admin: user.is_admin,
			admin_metadata: user?.admin_metadata,
			metadata: user?.metadata,
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
		throw new Error(
			"No account found with this email. Please sign up first."
		);
	}

	// Check if user has password (OAuth-only accounts)
	if (!user.password) {
		throw new Error(
			"This account was created with Google. Please use Google Sign In."
		);
	}

	// Verify password
	const isPasswordValid = await user.comparePassword(password);
	if (!isPasswordValid) {
		throw new Error("Incorrect password. Please try again.");
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
			profile_pic: user.profile_pic,
			is_admin: user.is_admin,
			admin_metadata: user.admin_metadata,
			metadata: user.metadata,
			is_deleted: user.is_deleted,
			createdAt: user.createdAt.toISOString(),
			updatedAt: user.updatedAt.toISOString(),
		},
	};
};

/**
 * Register a new user with OAuth (Google)
 * @param {String} googleId - Google ID
 * @param {String} email - User email
 * @param {String} role - User role (recruiter or candidate)
 * @param {String} profilePic - Profile picture URL
 * @returns {Object} Auth payload with token and user
 */
const registerWithOAuth = async (googleId, email, role, profilePic = null) => {
	// Check if user already exists
	const existingUser = await User.findOne({ email, is_deleted: false });
	if (existingUser) {
		// If they have a password, they registered with email/password
		if (existingUser.password) {
			throw new Error(
				"This email is already registered. Please log in with your password."
			);
		}
		throw new Error(
			"An account with this email already exists. Please log in."
		);
	}

	// Create new user
	const user = new User({
		email,
		google_id: googleId,
		role,
		profile_pic: profilePic,
		is_admin: false,
		is_deleted: false,
	});

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
			profile_pic: user.profile_pic,
			is_admin: user.is_admin,
			admin_metadata: user.admin_metadata,
			metadata: user.metadata,
			is_deleted: user.is_deleted,
			createdAt: user.createdAt.toISOString(),
			updatedAt: user.updatedAt.toISOString(),
		},
	};
};

/**
 * Login user with OAuth
 * @param {Object} user - User object from passport
 * @returns {Object} Auth payload with token and user
 */
const loginWithOAuth = async (user) => {
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
			profile_pic: user.profile_pic,
			is_admin: user.is_admin,
			admin_metadata: user.admin_metadata,
			metadata: user.metadata,
			is_deleted: user.is_deleted,
			createdAt: user.createdAt.toISOString(),
			updatedAt: user.updatedAt.toISOString(),
		},
	};
};

module.exports = {
	register,
	login,
	registerWithOAuth,
	loginWithOAuth,
};
