const AWS = require("aws-sdk");

// Configure AWS SDK from environment variables
// Required env vars:
// - AWS_ACCESS_KEY_ID
// - AWS_SECRET_ACCESS_KEY
// - AWS_REGION
// - AWS_S3_RESUME_BUCKET

AWS.config.update({
	region: process.env.AWS_REGION,
	accessKeyId: process.env.AWS_ACCESS_KEY_ID,
	secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const s3 = new AWS.S3();

const RESUME_BUCKET = process.env.AWS_S3_RESUME_BUCKET;

module.exports = {
	s3,
	RESUME_BUCKET,
};

