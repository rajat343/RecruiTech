const express = require("express");
const multer = require("multer");
const { s3, RESUME_BUCKET } = require("../config/s3");
const { requireAuthExpress } = require("../middleware/auth");

const router = express.Router();

// In-memory storage; we immediately stream to S3
const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /upload/resume
 * Auth: candidate only (via JWT)
 * Body: multipart/form-data with field "file"
 * Returns: { url: "https://..." }
 */
router.post(
	"/resume",
	requireAuthExpress,
	upload.single("file"),
	async (req, res) => {
		try {
			const user = req.user;
			if (!user || user.role !== "candidate") {
				return res.status(403).json({ error: "Only candidates can upload resumes" });
			}

			if (!req.file) {
				return res.status(400).json({ error: "No file uploaded" });
			}

			if (!RESUME_BUCKET) {
				return res
					.status(500)
					.json({ error: "Resume bucket is not configured on the server" });
			}

			const file = req.file;
			const extension = file.originalname.split(".").pop() || "pdf";

			// Store one canonical resume per user: resumes/<userId>.<ext>
			const key = `resumes/${user._id}.${extension}`;

			const params = {
				Bucket: RESUME_BUCKET,
				Key: key,
				Body: file.buffer,
				ContentType: file.mimetype,
				ACL: "private",
			};

			await s3.putObject(params).promise();

			const url = `https://${RESUME_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

			res.status(201).json({ url });
		} catch (error) {
			console.error("Resume upload error:", error);
			res.status(500).json({ error: "Failed to upload resume" });
		}
	}
);

module.exports = router;

