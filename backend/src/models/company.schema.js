const mongoose = require("mongoose");

const companySchema = new mongoose.Schema(
	{
		created_by: {
			type: String,
			required: true,
			immutable: true,
		},
		name: { type: String, required: true, trim: true },
		domain: {
			type: String,
			required: true,
			unique: true,
			trim: true,
		},
		is_verified: { type: Boolean, default: false },
		is_deleted: { type: Boolean, default: false },
	},
	{
		timestamps: true,
	}
);

const Company = mongoose.model("Company", companySchema);

module.exports = Company;
