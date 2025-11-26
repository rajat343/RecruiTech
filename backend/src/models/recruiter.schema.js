const mongoose = require("mongoose");

const recruiterSchema = new mongoose.Schema(
	{
		user_id: {
			type: String,
			required: true,
			immutable: true,
		},
		first_name: { type: String, required: true, trim: true },
		last_name: { type: String, required: true, trim: true },
		email: {
			type: String,
			required: true,
			unique: true,
			trim: true,
		},
		phone_number: { type: String },
		company_id: {
			type: String,
			required: true,
			immutable: true,
		},
		verification_status: {
			type: String,
			enum: ["pending", "verified", "rejected"],
			default: "verified", // TODO: Discuss
		},
		is_deleted: { type: Boolean, default: false },
	},
	{
		timestamps: true,
	}
);

const Recruiter = mongoose.model("Recruiter", recruiterSchema);

module.exports = Recruiter;
