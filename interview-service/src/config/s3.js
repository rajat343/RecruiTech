const AWS = require("aws-sdk");

/**
 * Optional S3 for interview video recordings.
 * If AWS_S3_INTERVIEW_BUCKET is unset, recordings stay on local disk (multer).
 *
 * Env (same credentials pattern as backend resumes):
 * - AWS_ACCESS_KEY_ID
 * - AWS_SECRET_ACCESS_KEY
 * - AWS_REGION (e.g. us-east-2)
 * - AWS_S3_INTERVIEW_BUCKET (e.g. recruitech-interviews)
 * - AWS_S3_INTERVIEW_PREFIX (optional, default "interviews")
 */

const BUCKET = (process.env.AWS_S3_INTERVIEW_BUCKET || "").trim();
const PREFIX = (process.env.AWS_S3_INTERVIEW_PREFIX || "interviews").replace(
	/^\/+|\/+$/g,
	""
);
const REGION = (process.env.AWS_REGION || "").trim();

let s3 = null;
if (BUCKET && REGION) {
	const config = { region: REGION };
	if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
		config.accessKeyId = process.env.AWS_ACCESS_KEY_ID;
		config.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
	}
	AWS.config.update(config);
	s3 = new AWS.S3();
}

function isS3Enabled() {
	return !!(s3 && BUCKET);
}

/**
 * @param {Buffer} body
 * @param {string} interviewId
 * @param {string} ext - without dot, e.g. webm
 * @param {string} contentType
 * @returns {Promise<string>} HTTPS object URL
 */
async function uploadInterviewRecording(body, interviewId, ext, contentType) {
	if (!isS3Enabled()) {
		throw new Error("S3 is not configured for interview recordings");
	}
	const safeId = String(interviewId).replace(/[^a-zA-Z0-9_-]/g, "");
	const key = `${PREFIX}/${safeId}/${Date.now()}.${ext}`;

	await s3
		.putObject({
			Bucket: BUCKET,
			Key: key,
			Body: body,
			ContentType: contentType || "video/webm",
		})
		.promise();

	return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}

module.exports = {
	isS3Enabled,
	uploadInterviewRecording,
	BUCKET,
	REGION,
};
