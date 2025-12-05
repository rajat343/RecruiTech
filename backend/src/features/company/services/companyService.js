const Company = require("../../../models/company.schema");
const User = require("../../../models/user.schema");

const createCompany = async (companyData, userId) => {
	// Verify user exists and has recruiter role
	const user = await User.findById(userId);
	if (!user || user.is_deleted) {
		throw new Error("User not found");
	}
	if (user.role !== "recruiter" && !user.is_admin) {
		throw new Error("User must have recruiter role to create a company");
	}
	// Check if company with same domain already exists
	const domain = companyData.domain.toLowerCase();
	const existingCompany = await Company.findOne({
		domain,
		is_deleted: false,
	});
	if (existingCompany) {
		throw new Error("Company with this domain already exists");
	}
	const company = new Company({
		...companyData,
		domain,
		created_by: userId,
		is_verified: true,
		is_deleted: false,
	});
	await company.save();
	return company;
};

const getCompanyById = async (companyId) => {
	const company = await Company.findOne({
		id: companyId,
		is_deleted: false,
	});
	if (!company) {
		throw new Error("Company not found");
	}
	return company;
};

const getCompanies = async ({ search, limit = 10, offset = 0 }) => {
	const query = { is_deleted: false, is_verified: true };

	// Add search filter - case insensitive prefix match
	if (search && search.trim()) {
		query.name = { $regex: `^${search.trim()}`, $options: "i" };
	}

	const companies = await Company.find(query)
		.limit(parseInt(limit))
		.skip(parseInt(offset))
		.sort({ createdAt: -1 });

	return companies;
};

const updateCompany = async (companyId, updateData, userId) => {
	const company = await Company.findById(companyId);
	if (!company || company.is_deleted) {
		throw new Error("Company not found");
	}
	const user = await User.findById(userId);
	if (!user || user.is_deleted) {
		throw new Error("User not found");
	}
	if (company.created_by.toString() !== userId && !user.is_admin) {
		throw new Error("Unauthorized to update this company");
	}
	if (
		Object.prototype.hasOwnProperty.call(updateData, "is_verified") &&
		!user.is_admin
	) {
		delete updateData.is_verified;
	}
	if (updateData.domain) {
		updateData.domain = updateData.domain.toLowerCase();
	}
	Object.keys(updateData).forEach((key) => {
		if (updateData[key] !== undefined) {
			company[key] = updateData[key];
		}
	});
	await company.save();
	return company;
};

const deleteCompany = async (companyId, userId) => {
	const company = await Company.findById(companyId);
	if (!company || company.is_deleted) {
		throw new Error("Company not found");
	}
	const user = await User.findById(userId);
	if (!user || user.is_deleted) {
		throw new Error("User not found");
	}
	if (company.created_by.toString() !== userId && !user.is_admin) {
		throw new Error("Unauthorized to delete this company");
	}
	company.is_deleted = true;
	await company.save();
	return true;
};

module.exports = {
	createCompany,
	getCompanyById,
	getCompanies,
	updateCompany,
	deleteCompany,
};
