const Candidate = require("../../../models/candidate.schema");
const User = require("../../../models/user.schema");

const createCandidate = async (candidateData, userId) => {
	const user = await User.findById(userId);
	if (!user || user.is_deleted) {
		throw new Error("User not found");
	}
	if (user.role !== "candidate") {
		throw new Error("User must have candidate role");
	}
	const existingCandidate = await Candidate.findOne({
		user_id: userId,
		is_deleted: false,
	});
	if (existingCandidate) {
		throw new Error("Candidate profile already exists");
	}
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

const getCandidateById = async (candidateId) => {
	const candidate = await Candidate.findById(candidateId);
	if (!candidate || candidate.is_deleted) {
		throw new Error("Candidate not found");
	}
	return candidate;
};

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

const updateCandidate = async (candidateId, updateData, userId) => {
	const candidate = await Candidate.findById(candidateId);
	if (!candidate || candidate.is_deleted) {
		throw new Error("Candidate not found");
	}
	const user = await User.findById(userId);
	if (!user || user.is_deleted) {
		throw new Error("User not found");
	}
	if (candidate.user_id.toString() !== userId && !user.is_admin) {
		throw new Error("Unauthorized to update this candidate profile");
	}
	Object.keys(updateData).forEach((key) => {
		if (updateData[key] !== undefined) {
			candidate[key] = updateData[key];
		}
	});
	await candidate.save();
	return candidate;
};

const deleteCandidate = async (candidateId, userId) => {
	const candidate = await Candidate.findById(candidateId);
	if (!candidate || candidate.is_deleted) {
		throw new Error("Candidate not found");
	}
	const user = await User.findById(userId);
	if (!user || user.is_deleted) {
		throw new Error("User not found");
	}
	if (candidate.user_id.toString() !== userId && !user.is_admin) {
		throw new Error("Unauthorized to delete this candidate profile");
	}
	candidate.is_deleted = true;
	await candidate.save();
	return true;
};

module.exports = {
	createCandidate,
	getCandidateById,
	getCandidateByUserId,
	getCandidates,
	updateCandidate,
	deleteCandidate,
};
