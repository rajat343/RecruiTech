const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    recruiter_id: { type: String, required: true, immutable: true }, // Recruiter profile id
    company_id: { type: String, required: true }, // Company id from recruiter profile
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    employment_type: {
      type: String,
      enum: ["full_time", "part_time", "contract", "internship", "freelance"],
      required: true,
    },
    experience_level: {
      type: String,
      enum: ["junior", "mid", "senior", "lead"],
      required: true,
    },
    location_type: {
      type: String,
      enum: ["onsite", "remote", "hybrid"],
      required: true,
    },
    location: { type: String, required: true }, // City / Region or Remote tag
    salary_min: { type: Number },
    salary_max: { type: Number },
    salary_currency: { type: String, default: "USD" },
    skills: { type: [String], default: [] },
    apply_url: { type: String },
    is_active: { type: Boolean, default: true },
    is_deleted: { type: Boolean, default: false },
    metadata: { type: Object },
  },
  { timestamps: true }
);

const Job = mongoose.model("Job", jobSchema);
module.exports = Job;
