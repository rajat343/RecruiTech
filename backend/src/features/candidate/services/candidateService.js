const Candidate = require("../../../models/candidate.schema");
const User = require("../../../models/user.schema");
const Education = require("../../../models/education.schema");
const Experience = require("../../../models/experience.schema");

/**
 * Create a new candidate profile
 * @param {Object} candidateData - Candidate data
 * @param {String} userId - User ID
 * @returns {Object} Created candidate
 */
const createCandidate = async (candidateData, userId) => {
	// Verify user exists and has candidate role
	const user = await User.findById(userId);
	if (!user || user.is_deleted) {
		throw new Error("User not found");
	}
	if (user.role !== "candidate") {
		throw new Error("User must have candidate role");
	}

	// Check if candidate profile already exists
	const existingCandidate = await Candidate.findOne({
		user_id: userId,
		is_deleted: false,
	});
	if (existingCandidate) {
		throw new Error("Candidate profile already exists");
	}

	// Check if email is already taken
	const emailExists = await Candidate.findOne({
		email: candidateData.email.toLowerCase(),
		is_deleted: false,
	});
	if (emailExists) {
		throw new Error("Email already registered");
	}

	const candidate = new Candidate({
		...candidateData,
		email: candidateData.email.toLowerCase(),
		user_id: userId,
		status: candidateData.status || "casually_looking",
		is_deleted: false,
	});

	await candidate.save();
	return candidate;
};

/**
 * Get candidate by ID
 * @param {String} candidateId - Candidate ID
 * @returns {Object} Candidate object
 */
const getCandidateById = async (candidateId) => {
	const candidate = await Candidate.findById(candidateId);
	if (!candidate || candidate.is_deleted) {
		throw new Error("Candidate not found");
	}
	return candidate;
};

/**
 * Get candidate by user ID
 * @param {String} userId - User ID
 * @returns {Object} Candidate object
 */
const getCandidateByUserId = async (userId) => {
	const candidate = await Candidate.findOne({
		user_id: userId,
		is_deleted: false,
	});
	if (!candidate) {
		throw new Error("Candidate profile not found");
	}
	return candidate;
};

/**
 * Get all candidates with optional filters
 * @param {Object} filters - Filter options (status, limit, offset)
 * @returns {Array} Array of candidates
 */
const getCandidates = async ({ status, limit = 10, offset = 0 }) => {
	const query = { is_deleted: false };
	if (status) {
		query.status = status;
	}

	const candidates = await Candidate.find(query)
		.limit(parseInt(limit))
		.skip(parseInt(offset))
		.sort({ createdAt: -1 });

	return candidates;
};

/**
 * Update candidate profile
 * @param {String} candidateId - Candidate ID
 * @param {Object} updateData - Update data
 * @param {String} userId - User ID (for authorization)
 * @returns {Object} Updated candidate
 */
const updateCandidate = async (candidateId, updateData, userId) => {
	const candidate = await Candidate.findById(candidateId);
	if (!candidate || candidate.is_deleted) {
		throw new Error("Candidate not found");
	}

	// Check if user owns this profile or is admin
	const user = await User.findById(userId);
	if (!user || user.is_deleted) {
		throw new Error("User not found");
	}

	if (candidate.user_id.toString() !== userId && !user.is_admin) {
		throw new Error("Unauthorized to update this candidate profile");
	}

	// Update fields
	Object.keys(updateData).forEach((key) => {
		if (updateData[key] !== undefined) {
			candidate[key] = updateData[key];
		}
	});

	await candidate.save();
	return candidate;
};

/**
 * Soft delete candidate
 * @param {String} candidateId - Candidate ID
 * @param {String} userId - User ID (for authorization)
 * @returns {Boolean} Success status
 */
const deleteCandidate = async (candidateId, userId) => {
	const candidate = await Candidate.findById(candidateId);
	if (!candidate || candidate.is_deleted) {
		throw new Error("Candidate not found");
	}

	// Check if user owns this profile or is admin
	const user = await User.findById(userId);
	if (!user || user.is_deleted) {
		throw new Error("User not found");
	}

	if (candidate.user_id.toString() !== userId && !user.is_admin) {
		throw new Error("Unauthorized to delete this candidate profile");
	}

	await candidate.softDelete();
	return true;
};

const getFullCandidateProfile = async (candidateId) => {
	const candidate = await Candidate.findById(candidateId);
	if (!candidate || candidate.is_deleted) throw new Error("Candidate not found");

	const education = await Education.find({
		candidate_id: candidateId,
		is_deleted: false,
	});

	const experience = await Experience.find({
		candidate_id: candidateId,
		is_deleted: false,
	});

	return {
		...candidate.toObject(),
		education,
		experience,
	};
};

module.exports = {
	createCandidate,
	getCandidateById,
	getCandidateByUserId,
	getCandidates,
	updateCandidate,
	deleteCandidate,
	getFullCandidateProfile,
};
