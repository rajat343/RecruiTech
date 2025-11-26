const Company = require("../../../models/company.schema");
const User = require("../../../models/user.schema");

/**
 * Create a new company
 * @param {Object} companyData - Company data
 * @param {String} userId - User ID of creator
 * @returns {Object} Created company
 */
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
		is_verified: false,
		is_deleted: false,
	});

	await company.save();
	return company;
};

/**
 * Get company by ID
 * @param {String} companyId - Company ID
 * @returns {Object} Company object
 */
const getCompanyById = async (companyId) => {
	const company = await Company.findById(companyId);
	if (!company || company.is_deleted) {
		throw new Error("Company not found");
	}
	return company;
};

/**
 * Get companies with optional filters
 * @param {Object} filters - Filter options (is_verified, limit, offset)
 * @returns {Array} Array of companies
 */
const getCompanies = async ({ is_verified, limit = 10, offset = 0 }) => {
	const query = { is_deleted: false };
	if (typeof is_verified === "boolean") {
		query.is_verified = is_verified;
	}

	const companies = await Company.find(query)
		.limit(parseInt(limit))
		.skip(parseInt(offset))
		.sort({ createdAt: -1 });

	return companies;
};

/**
 * Update company
 * @param {String} companyId - Company ID
 * @param {Object} updateData - Update data
 * @param {String} userId - User ID (for authorization)
 * @returns {Object} Updated company
 */
const updateCompany = async (companyId, updateData, userId) => {
	const company = await Company.findById(companyId);
	if (!company || company.is_deleted) {
		throw new Error("Company not found");
	}

	const user = await User.findById(userId);
	if (!user || user.is_deleted) {
		throw new Error("User not found");
	}

	// Only creator or admin can update
	if (company.created_by.toString() !== userId && !user.is_admin) {
		throw new Error("Unauthorized to update this company");
	}

	// Only admin can directly change verification state
	if (
		Object.prototype.hasOwnProperty.call(updateData, "is_verified") &&
		!user.is_admin
	) {
		delete updateData.is_verified;
	}

	// Normalize domain if updated
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

/**
 * Soft delete company
 * @param {String} companyId - Company ID
 * @param {String} userId - User ID (for authorization)
 * @returns {Boolean} Success status
 */
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

	await company.softDelete();
	return true;
};

module.exports = {
	createCompany,
	getCompanyById,
	getCompanies,
	updateCompany,
	deleteCompany,
};
