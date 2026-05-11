const AWS = require("aws-sdk");

/**
 * Parses virtual-hosted-style S3 URL:
 * https://bucket.s3.region.amazonaws.com/key/parts
 */
function parseVirtualHostedS3Url(urlString) {
	if (!urlString || typeof urlString !== "string") return null;
	let u;
	try {
		u = new URL(urlString.trim());
	} catch {
		return null;
	}
	const hostMatch = /^(.+)\.s3\.([^.]+)\.amazonaws\.com$/i.exec(u.hostname);
	if (!hostMatch) return null;
	const bucket = hostMatch[1];
	const region = hostMatch[2];
	const key = decodeURIComponent(u.pathname.replace(/^\//, ""));
	if (!bucket || !region || !key) return null;
	return { bucket, region, key };
}

/** AWS SigV4 presigned GET max is 604800 s (7 days). */
const MAX_PRESIGN_SECONDS = 604800;
const MIN_PRESIGN_SECONDS = 60;

function getRecordingPresignExpiresSeconds() {
	const raw = process.env.S3_RECORDING_PRESIGN_EXPIRES_SECONDS;
	const n = raw ? parseInt(String(raw).trim(), 10) : NaN;
	if (!Number.isFinite(n) || n <= 0) return MAX_PRESIGN_SECONDS;
	return Math.min(MAX_PRESIGN_SECONDS, Math.max(MIN_PRESIGN_SECONDS, n));
}

/**
 * Signed GET URL for private interview recordings (browser opens without AWS creds).
 * Default lifetime is 7 days (S3 SigV4 maximum). Override with S3_RECORDING_PRESIGN_EXPIRES_SECONDS.
 * If signing uses temporary STS creds, URLs may stop working when those creds expire regardless.
 *
 * @param {string} recordingUrl https://bucket.s3.region.amazonaws.com/...
 * @param {number} [expiresSeconds] optional override; otherwise env/default
 * @returns {Promise<string|null>}
 */
async function getPresignedRecordingGetUrl(
	recordingUrl,
	expiresSeconds = getRecordingPresignExpiresSeconds()
) {
	const parsed = parseVirtualHostedS3Url(recordingUrl);
	if (!parsed) return null;

	const ttl = Math.min(
		MAX_PRESIGN_SECONDS,
		Math.max(MIN_PRESIGN_SECONDS, expiresSeconds)
	);

	const s3Regional = new AWS.S3({
		region: parsed.region,
		signatureVersion: "v4",
	});

	try {
		const url = await s3Regional.getSignedUrlPromise("getObject", {
			Bucket: parsed.bucket,
			Key: parsed.key,
			Expires: ttl,
		});
		return typeof url === "string" ? url : null;
	} catch (err) {
		console.error("[S3 presign]", err.message);
		return null;
	}
}

module.exports = {
	parseVirtualHostedS3Url,
	getPresignedRecordingGetUrl,
	getRecordingPresignExpiresSeconds,
	MAX_PRESIGN_SECONDS,
};
