const Education = require("../../../models/education.schema");
const Candidate = require("../../../models/candidate.schema");

const createEducation = async (candidateId, data, userId) => {
	const candidate = await Candidate.findById(candidateId);
	if (!candidate || candidate.is_deleted) throw new Error("Candidate not found");

	// Ensure user owns profile
	if (candidate.user_id.toString() !== userId) {
		throw new Error("Unauthorized");
	}

	const edu = new Education({
		...data,
		candidate_id: candidateId,
		is_deleted: false,
	});

	await edu.save();
	return edu;
};

const updateEducation = async (educationId, data, userId) => {
	const edu = await Education.findById(educationId);
	if (!edu || edu.is_deleted) throw new Error("Education entry not found");

	const candidate = await Candidate.findById(edu.candidate_id);

	if (candidate.user_id.toString() !== userId) {
		throw new Error("Unauthorized");
	}

	Object.assign(edu, data);
	await edu.save();

	return edu;
};

const deleteEducation = async (educationId, userId) => {
	const edu = await Education.findById(educationId);
	if (!edu || edu.is_deleted) throw new Error("Education entry not found");

	const candidate = await Candidate.findById(edu.candidate_id);

	if (candidate.user_id.toString() !== userId) {
		throw new Error("Unauthorized");
	}

	edu.is_deleted = true;
	await edu.save();

	return true;
};

module.exports = {
	createEducation,
	updateEducation,
	deleteEducation,
};
