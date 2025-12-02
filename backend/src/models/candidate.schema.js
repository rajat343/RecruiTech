const mongoose = require("mongoose");

const candidateSchema = new mongoose.Schema(
	{
		user_id: {
			type: String,
			required: true,
			immutable: true,
		},
		first_name: {
			type: String,
			required: true,
			trim: true,
		},
		last_name: {
			type: String,
			required: true,
			trim: true,
		},
		email: {
			type: String,
			required: true,
			unique: true,
			trim: true,
		},
		phone_number: { type: String },
		resume_url: { type: String, required: true, trim: true },
		github_url: { type: String, trim: true },
		leetcode_url: { type: String, trim: true },
		portfolio_url: { type: String, trim: true },
		other_links: [String],
		authorized_us: Boolean,
		authorized_uk: Boolean,
		authorized_canada: Boolean,
		requires_sponsorship: Boolean,
		location: String,
		dob: String,
		skills: [String],
		ethnicity: String,
		disability: String,
		veteran: Boolean,
		lgbtq: Boolean,
		gender: String,
		profile_summary: { type: String },
		status: {
			type: String,
			enum: ["actively_looking", "casually_looking", "not_looking"],
			default: "actively_looking",
		},
		is_deleted: { type: Boolean, default: false },
	},
	{
		timestamps: true,
	}
);

const Candidate = mongoose.model("Candidate", candidateSchema);

module.exports = Candidate;
