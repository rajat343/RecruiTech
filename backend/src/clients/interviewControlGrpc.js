const path = require("path");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

const PROTO_PATH = path.join(
	__dirname,
	"../../../interview-service/proto/interview_control.proto",
);

let clientSingleton = null;

const getClient = () => {
	const address = (process.env.INTERVIEW_SERVICE_GRPC_ADDRESS || "").trim();
	if (!address) {
		throw new Error(
			"INTERVIEW_SERVICE_GRPC_ADDRESS is required — backend creates AI interviews only via interview-service gRPC",
		);
	}
	if (clientSingleton) return clientSingleton;

	const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
		keepCase: true,
		longs: String,
		enums: String,
		defaults: true,
		oneofs: true,
	});

	const grpcRoot = grpc.loadPackageDefinition(packageDefinition);
	const pkg = grpcRoot.interview?.control ?? grpcRoot["interview.control"];
	if (!pkg?.InterviewControl) {
		throw new Error(
			"Failed to load proto: interview.control.InterviewControl not found",
		);
	}
	clientSingleton = new pkg.InterviewControl(
		address,
		grpc.credentials.createInsecure(),
	);
	return clientSingleton;
};

/**
 * Create interview document via interview-service gRPC (same MongoDB as backend).
 */
const createInterviewSessionGrpc = (fields) => {
	let client;
	try {
		client = getClient();
	} catch (e) {
		return Promise.resolve({
			ok: false,
			error_message: e.message,
		});
	}

	const req = {
		application_id: fields.application_id,
		candidate_id: fields.candidate_id,
		user_id: fields.user_id,
		job_id: fields.job_id,
		resume_text: fields.resume_text || "",
		resume_url: fields.resume_url || "",
		job_title: fields.job_title || "",
		job_description: fields.job_description || "",
		interview_focus_areas: fields.interview_focus_areas || [],
		strength_tags: fields.strength_tags || [],
		internal_secret: process.env.GRPC_INTERNAL_SECRET || "",
	};

	return new Promise((resolve, reject) => {
		client.CreateInterviewSession(req, (err, response) => {
			if (err) return reject(err);
			resolve(response);
		});
	});
};

module.exports = { getClient, createInterviewSessionGrpc };
