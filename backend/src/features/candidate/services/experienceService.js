const Experience = require("../../../models/experience.schema");
const Candidate = require("../../../models/candidate.schema");

const createExperience = async (candidateId, data, userId) => {
	const candidate = await Candidate.findById(candidateId);
	if (!candidate || candidate.is_deleted) throw new Error("Candidate not found");

	if (candidate.user_id.toString() !== userId) {
		throw new Error("Unauthorized");
	}

	const exp = new Experience({
		...data,
		candidate_id: candidateId,
		is_deleted: false,
	});

	await exp.save();
	return exp;
};

const updateExperience = async (experienceId, data, userId) => {
	const exp = await Experience.findById(experienceId);
	if (!exp || exp.is_deleted) throw new Error("Experience entry not found");

	const candidate = await Candidate.findById(exp.candidate_id);

	if (candidate.user_id.toString() !== userId) {
		throw new Error("Unauthorized");
	}

	Object.assign(exp, data);
	await exp.save();

	return exp;
};

const deleteExperience = async (experienceId, userId) => {
	const exp = await Experience.findById(experienceId);
	if (!exp || exp.is_deleted) throw new Error("Experience entry not found");

	const candidate = await Candidate.findById(exp.candidate_id);

	if (candidate.user_id.toString() !== userId) {
		throw new Error("Unauthorized");
	}

	exp.is_deleted = true;
	await exp.save();

	return true;
};

module.exports = {
	createExperience,
	updateExperience,
	deleteExperience,
};
