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
		// Location
		location_city: { type: String, trim: true },
		location_state: { type: String, trim: true },
		location_country: { type: String, trim: true },
		// Work eligibility
		work_authorized: { type: Boolean },
		sponsorship_needed: { type: Boolean },
		// Professional links
		linkedin_url: { type: String, trim: true },
		github_url: { type: String, trim: true },
		leetcode_url: { type: String, trim: true },
		portfolio_url: { type: String, trim: true },
		// Professional summary
		headline: { type: String, trim: true },
		skills: { type: [String], default: [] },
		// Detailed work experience entries
		work_experiences: [
			{
				title: { type: String, trim: true },
				company: { type: String, trim: true },
				start_date: { type: String, trim: true }, // e.g. YYYY-MM
				end_date: { type: String, trim: true }, // e.g. YYYY-MM
				is_current: { type: Boolean },
				description: { type: String },
			},
		],
		// Detailed education entries
		educations: [
			{
				school: { type: String, trim: true },
				degree: { type: String, trim: true },
				graduation_year: { type: Number },
			},
		],
		profile_summary: { type: String },
		status: {
			type: String,
			enum: ["actively_looking", "casually_looking", "not_looking"],
			default: "actively_looking",
		},
		// Optional demographics (EEOC-style)
		demographics: {
			race_ethnicity: { type: String },
			gender: { type: String },
			disability: { type: String },
		},
		is_deleted: { type: Boolean, default: false },
	},
	{
		timestamps: true,
	}
);

const Candidate = mongoose.model("Candidate", candidateSchema);

module.exports = Candidate;
