const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const router = express.Router();
const { requireAuthExpress } = require("../middleware/auth");
const interviewService = require("../services/interviewService");
const Interview = require("../models/interview.schema");

const RECORDINGS_DIR = path.join(__dirname, "../../recordings");
if (!fs.existsSync(RECORDINGS_DIR)) {
	fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
	destination: (req, file, cb) => cb(null, RECORDINGS_DIR),
	filename: (req, file, cb) => {
		const ext = file.mimetype.includes("webm") ? "webm" : "mp4";
		cb(null, `${req.params.interviewId}-${Date.now()}.${ext}`);
	},
});
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } });

router.post("/create", requireAuthExpress, async (req, res) => {
	try {
		const {
			application_id,
			candidate_id,
			job_id,
			resume_text,
			resume_url,
			job_title,
			job_description,
		} = req.body;

		if (!application_id || !candidate_id || !job_id) {
			return res.status(400).json({
				error: "application_id, candidate_id, and job_id are required",
			});
		}

		const interview = await interviewService.createInterview({
			application_id,
			candidate_id,
			user_id: req.user.id,
			job_id,
			resume_text: resume_text || "",
			resume_url: resume_url || "",
			job_title: job_title || "",
			job_description: job_description || "",
		});

		res.status(201).json({
			id: interview._id.toString(),
			interview_token: interview.interview_token,
			status: interview.status,
			expires_at: interview.expires_at,
		});
	} catch (error) {
		console.error("Create interview error:", error);
		res.status(500).json({ error: error.message });
	}
});

router.post(
	"/:interviewId/recording",
	requireAuthExpress,
	upload.single("recording"),
	async (req, res) => {
		try {
			const interview = await Interview.findById(req.params.interviewId);
			if (!interview) {
				return res.status(404).json({ error: "Interview not found" });
			}
			if (interview.user_id !== req.user.id) {
				return res.status(403).json({ error: "Unauthorized" });
			}
			if (!req.file) {
				return res.status(400).json({ error: "No recording file" });
			}

			const recordingUrl = `/api/interviews/recordings/${req.file.filename}`;
			interview.recording_url = recordingUrl;
			await interview.save();

			res.json({ recording_url: recordingUrl });
		} catch (error) {
			console.error("Recording upload error:", error);
			res.status(500).json({ error: error.message });
		}
	}
);

router.get("/recordings/:filename", (req, res) => {
	const filePath = path.join(RECORDINGS_DIR, req.params.filename);
	if (!fs.existsSync(filePath)) {
		return res.status(404).json({ error: "Recording not found" });
	}
	res.sendFile(filePath);
});

router.get("/token/:token", requireAuthExpress, async (req, res) => {
	try {
		const interview = await interviewService.getInterviewByToken(req.params.token);
		if (!interview) {
			return res.status(404).json({ error: "Interview not found" });
		}

		if (interview.user_id !== req.user.id) {
			return res.status(403).json({ error: "Unauthorized" });
		}

		res.json({
			id: interview._id.toString(),
			interview_token: interview.interview_token,
			status: interview.status,
			job_title: interview.job_title,
			total_questions: interview.questions.length || interview.total_questions,
			current_question_index: interview.current_question_index,
			overall_score: interview.overall_score,
			overall_feedback: interview.overall_feedback,
			strengths: interview.strengths,
			improvements: interview.improvements,
			recording_url: interview.recording_url,
			started_at: interview.started_at,
			completed_at: interview.completed_at,
			expires_at: interview.expires_at,
		});
	} catch (error) {
		console.error("Get interview error:", error);
		res.status(500).json({ error: error.message });
	}
});

router.get("/application/:applicationId", requireAuthExpress, async (req, res) => {
	try {
		const interview = await interviewService.getInterviewForApplication(
			req.params.applicationId
		);
		if (!interview) {
			return res.json({ interview: null });
		}

		if (interview.user_id !== req.user.id) {
			return res.status(403).json({ error: "Unauthorized" });
		}

		res.json({
			interview: {
				id: interview._id.toString(),
				interview_token: interview.interview_token,
				status: interview.status,
				job_title: interview.job_title,
				overall_score: interview.overall_score,
				recording_url: interview.recording_url,
				expires_at: interview.expires_at,
			},
		});
	} catch (error) {
		console.error("Get interview for application error:", error);
		res.status(500).json({ error: error.message });
	}
});

router.get("/my-interviews", requireAuthExpress, async (req, res) => {
	try {
		const interviews = await interviewService.getInterviewsForCandidate(req.user.id);

		res.json(
			interviews.map((i) => ({
				id: i._id.toString(),
				interview_token: i.interview_token,
				status: i.status,
				job_title: i.job_title,
				overall_score: i.overall_score,
				recording_url: i.recording_url,
				started_at: i.started_at,
				completed_at: i.completed_at,
				expires_at: i.expires_at,
			}))
		);
	} catch (error) {
		console.error("Get my interviews error:", error);
		res.status(500).json({ error: error.message });
	}
});

module.exports = router;
