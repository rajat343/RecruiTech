const Recruiter = require("../../../models/recruiter.schema");
const Company = require("../../../models/company.schema");
const User = require("../../../models/user.schema");

const createRecruiter = async (recruiterData, userId) => {
	const user = await User.findById(userId);
	if (!user || user.is_deleted) {
		throw new Error("User not found");
	}
	if (user.role !== "recruiter") {
		throw new Error("User must have recruiter role");
	}
	const existingRecruiter = await Recruiter.findOne({
		user_id: userId,
		is_deleted: false,
	});
	if (existingRecruiter) {
		throw new Error("Recruiter profile already exists");
	}
	const emailExists = await Recruiter.findOne({
		email: recruiterData.email.toLowerCase(),
		is_deleted: false,
	});
	if (emailExists) {
		throw new Error("Email already registered");
	}
	const company = await Company.findById(recruiterData.company_id);
	if (!company || company.is_deleted) {
		throw new Error("Company not found");
	}
	const recruiter = new Recruiter({
		first_name: recruiterData.first_name,
		last_name: recruiterData.last_name,
		email: recruiterData.email.toLowerCase(),
		phone_number: recruiterData.phone_number,
		company_id: recruiterData.company_id,
		user_id: userId,
		verification_status: "verified",
		is_deleted: false,
	});
	await recruiter.save();
	return recruiter;
};

const getRecruiterById = async (recruiterId) => {
	const recruiter = await Recruiter.findById(recruiterId);
	if (!recruiter || recruiter.is_deleted) {
		throw new Error("Recruiter not found");
	}
	return recruiter;
};

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
	// Update fields
	Object.keys(updateData).forEach((key) => {
		if (updateData[key] !== undefined) {
			recruiter[key] = updateData[key];
		}
	});
	await recruiter.save();
	return recruiter;
};

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
	recruiter.is_deleted = true;
	await recruiter.save();
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
