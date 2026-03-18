const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const questionSchema = new mongoose.Schema(
	{
		question_text: { type: String, required: true },
		question_type: {
			type: String,
			enum: ["initial", "follow_up"],
			default: "initial",
		},
		category: {
			type: String,
			enum: ["technical", "behavioral", "situational", "job_specific", "project_based"],
		},
		candidate_answer: { type: String, default: "" },
		ai_evaluation: { type: String, default: "" },
		score: { type: Number, min: 0, max: 10 },
		parent_question_index: { type: Number, default: null },
		answered_at: { type: Date },
	},
	{ _id: false }
);

const interviewSchema = new mongoose.Schema(
	{
		application_id: { type: String, required: true },
		candidate_id: { type: String, required: true },
		user_id: { type: String, required: true },
		job_id: { type: String, required: true },
		interview_token: {
			type: String,
			unique: true,
			default: () => uuidv4(),
		},
		status: {
			type: String,
			enum: ["scheduled", "in_progress", "completed", "expired", "cancelled"],
			default: "scheduled",
		},
		resume_text: { type: String },
		resume_url: { type: String },
		job_title: { type: String },
		job_description: { type: String },
		questions: [questionSchema],
		current_question_index: { type: Number, default: 0 },
		total_questions: { type: Number, default: 7 },
		overall_score: { type: Number, min: 0, max: 100 },
		overall_feedback: { type: String },
		strengths: [String],
		improvements: [String],
		recording_url: { type: String },
		started_at: { type: Date },
		completed_at: { type: Date },
		expires_at: {
			type: Date,
			default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
		},
		is_deleted: { type: Boolean, default: false },
	},
	{ timestamps: true }
);

interviewSchema.index({ interview_token: 1 });
interviewSchema.index({ application_id: 1 });
interviewSchema.index({ candidate_id: 1 });
interviewSchema.index({ user_id: 1 });

const Interview = mongoose.model("Interview", interviewSchema);
module.exports = Interview;
