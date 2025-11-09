const Recruiter = require("../../../models/recruiter.schema");
const User = require("../../../models/user.schema");

/**
 * Create a new recruiter profile
 * @param {Object} recruiterData - Recruiter data
 * @param {String} userId - User ID
 * @returns {Object} Created recruiter
 */
const createRecruiter = async (recruiterData, userId) => {
	// Verify user exists and has recruiter role
	const user = await User.findById(userId);
	if (!user || user.is_deleted) {
		throw new Error("User not found");
	}
	if (user.role !== "recruiter") {
		throw new Error("User must have recruiter role");
	}

	// Check if recruiter profile already exists
	const existingRecruiter = await Recruiter.findOne({
		user_id: userId,
		is_deleted: false,
	});
	if (existingRecruiter) {
		throw new Error("Recruiter profile already exists");
	}

	// Check if email is already taken
	const emailExists = await Recruiter.findOne({
		email: recruiterData.email.toLowerCase(),
		is_deleted: false,
	});
	if (emailExists) {
		throw new Error("Email already registered");
	}

	const recruiter = new Recruiter({
		...recruiterData,
		email: recruiterData.email.toLowerCase(),
		user_id: userId,
		verification_status: "pending",
		is_deleted: false,
	});

	await recruiter.save();
	return recruiter;
};

/**
 * Get recruiter by ID
 * @param {String} recruiterId - Recruiter ID
 * @returns {Object} Recruiter object
 */
const getRecruiterById = async (recruiterId) => {
	const recruiter = await Recruiter.findById(recruiterId);
	if (!recruiter || recruiter.is_deleted) {
		throw new Error("Recruiter not found");
	}
	return recruiter;
};

/**
 * Get recruiter by user ID
 * @param {String} userId - User ID
 * @returns {Object} Recruiter object
 */
const getRecruiterByUserId = async (userId) => {
	const recruiter = await Recruiter.findOne({
		user_id: userId,
		is_deleted: false,
	});
	if (!recruiter) {
		throw new Error("Recruiter profile not found");
	}
	return recruiter;
};

/**
 * Get all recruiters with optional filters
 * @param {Object} filters - Filter options (verification_status, limit, offset)
 * @returns {Array} Array of recruiters
 */
const getRecruiters = async ({
	verification_status,
	limit = 10,
	offset = 0,
}) => {
	const query = { is_deleted: false };
	if (verification_status) {
		query.verification_status = verification_status;
	}

	const recruiters = await Recruiter.find(query)
		.limit(parseInt(limit))
		.skip(parseInt(offset))
		.sort({ createdAt: -1 });

	return recruiters;
};

/**
 * Update recruiter profile
 * @param {String} recruiterId - Recruiter ID
 * @param {Object} updateData - Update data
 * @param {String} userId - User ID (for authorization)
 * @returns {Object} Updated recruiter
 */
const updateRecruiter = async (recruiterId, updateData, userId) => {
	const recruiter = await Recruiter.findById(recruiterId);
	if (!recruiter || recruiter.is_deleted) {
		throw new Error("Recruiter not found");
	}

	// Check if user owns this profile or is admin
	const user = await User.findById(userId);
	if (!user || user.is_deleted) {
		throw new Error("User not found");
	}

	if (recruiter.user_id.toString() !== userId && !user.is_admin) {
		throw new Error("Unauthorized to update this recruiter profile");
	}

	// Only admins can update verification_status
	if (updateData.verification_status && !user.is_admin) {
		delete updateData.verification_status;
	}

	// Update fields
	Object.keys(updateData).forEach((key) => {
		if (updateData[key] !== undefined) {
			recruiter[key] = updateData[key];
		}
	});

	await recruiter.save();
	return recruiter;
};

/**
 * Update recruiter verification status (admin only)
 * @param {String} recruiterId - Recruiter ID
 * @param {String} verificationStatus - New verification status
 * @returns {Object} Updated recruiter
 */
const updateRecruiterVerification = async (recruiterId, verificationStatus) => {
	const recruiter = await Recruiter.findById(recruiterId);
	if (!recruiter || recruiter.is_deleted) {
		throw new Error("Recruiter not found");
	}

	if (!["pending", "verified", "rejected"].includes(verificationStatus)) {
		throw new Error("Invalid verification status");
	}

	recruiter.verification_status = verificationStatus;
	await recruiter.save();

	return recruiter;
};

/**
 * Soft delete recruiter
 * @param {String} recruiterId - Recruiter ID
 * @param {String} userId - User ID (for authorization)
 * @returns {Boolean} Success status
 */
const deleteRecruiter = async (recruiterId, userId) => {
	const recruiter = await Recruiter.findById(recruiterId);
	if (!recruiter || recruiter.is_deleted) {
		throw new Error("Recruiter not found");
	}

	// Check if user owns this profile or is admin
	const user = await User.findById(userId);
	if (!user || user.is_deleted) {
		throw new Error("User not found");
	}

	if (recruiter.user_id.toString() !== userId && !user.is_admin) {
		throw new Error("Unauthorized to delete this recruiter profile");
	}

	await recruiter.softDelete();
	return true;
};

module.exports = {
	createRecruiter,
	getRecruiterById,
	getRecruiterByUserId,
	getRecruiters,
	updateRecruiter,
	updateRecruiterVerification,
	deleteRecruiter,
};
