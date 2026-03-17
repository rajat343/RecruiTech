const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    job_id: { type: String, required: true, immutable: true },
    candidate_id: { type: String, required: true, immutable: true },
    user_id: { type: String, required: true, immutable: true },
    status: {
      type: String,
      enum: ["pending", "reviewed", "shortlisted", "rejected", "hired"],
      default: "pending",
    },
    cover_letter: { type: String },
    resume_url: { type: String },
    is_deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

applicationSchema.index({ job_id: 1, candidate_id: 1 }, { unique: true });
applicationSchema.index({ job_id: 1, is_deleted: 1 });
applicationSchema.index({ candidate_id: 1, is_deleted: 1 });

const Application = mongoose.model("Application", applicationSchema);
module.exports = Application;
