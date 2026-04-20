const path = require("path");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

const Interview = require("../models/interview.schema");
const interviewService = require("../services/interviewService");
const {
	processCandidateAnswer,
	finalizeInterviewDocument,
} = require("../services/interviewSessionActions");

const PROTO_PATH = path.resolve(__dirname, "../../proto/interview_control.proto");

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
	keepCase: true,
	longs: String,
	enums: String,
	defaults: true,
	oneofs: true,
});

const grpcRoot = grpc.loadPackageDefinition(packageDefinition);
// `package interview.control;` is exposed as nested `interview.control`, not the string key.
const interviewControlProto =
	grpcRoot.interview?.control ?? grpcRoot["interview.control"];
if (!interviewControlProto?.InterviewControl) {
	throw new Error(
		"Failed to load proto: interview.control.InterviewControl not found",
	);
}

const checkInternalSecret = (request) => {
	const expected = process.env.GRPC_INTERNAL_SECRET;
	if (!expected) return { ok: true };
	const provided = request.internal_secret || "";
	if (provided !== expected) {
		return {
			ok: false,
			deny: {
				ok: false,
				error_message: "invalid or missing internal_secret",
			},
		};
	}
	return { ok: true };
};

const createInterviewSession = async (call, callback) => {
	try {
		const auth = checkInternalSecret(call.request);
		if (!auth.ok) return callback(null, auth.deny);

		const r = call.request;
		if (!r.application_id || !r.candidate_id || !r.job_id) {
			return callback(null, {
				ok: false,
				error_message:
					"application_id, candidate_id, and job_id are required",
			});
		}
		if (!r.user_id) {
			return callback(null, {
				ok: false,
				error_message: "user_id is required",
			});
		}

		const interview = await interviewService.createInterview({
			application_id: r.application_id,
			candidate_id: r.candidate_id,
			user_id: r.user_id,
			job_id: r.job_id,
			resume_text: r.resume_text || "",
			resume_url: r.resume_url || "",
			job_title: r.job_title || "",
			job_description: r.job_description || "",
			interview_focus_areas: r.interview_focus_areas || [],
			strength_tags: r.strength_tags || [],
		});

		return callback(null, {
			ok: true,
			interview_id: interview._id.toString(),
			interview_token: interview.interview_token,
			status: interview.status,
			expires_at_ms: interview.expires_at
				? interview.expires_at.getTime()
				: 0,
		});
	} catch (err) {
		console.error("gRPC CreateInterviewSession:", err);
		return callback(null, {
			ok: false,
			error_message: err.message || "create failed",
		});
	}
};

const getInterviewStatus = async (call, callback) => {
	try {
		const auth = checkInternalSecret(call.request);
		if (!auth.ok) return callback(null, auth.deny);

		const r = call.request;
		const id = r.interview_id;
		const token = r.interview_token;

		let interview = null;
		if (id) {
			interview = await Interview.findOne({
				_id: id,
				is_deleted: false,
			});
		} else if (token) {
			interview = await Interview.findOne({
				interview_token: token,
				is_deleted: false,
			});
		} else {
			return callback(null, {
				ok: false,
				error_message: "interview_id or interview_token required",
			});
		}

		if (!interview) {
			return callback(null, {
				ok: false,
				error_message: "Interview not found",
			});
		}

		return callback(null, {
			ok: true,
			interview_id: interview._id.toString(),
			interview_token: interview.interview_token,
			status: interview.status,
			current_question_index: interview.current_question_index,
			total_questions: interview.questions.length,
			job_title: interview.job_title || "",
			expires_at_ms: interview.expires_at
				? interview.expires_at.getTime()
				: 0,
			interview_completed: interview.status === "completed",
		});
	} catch (err) {
		console.error("gRPC GetInterviewStatus:", err);
		return callback(null, {
			ok: false,
			error_message: err.message || "lookup failed",
		});
	}
};

const submitAnswerForScoring = async (call, callback) => {
	try {
		const auth = checkInternalSecret(call.request);
		if (!auth.ok) return callback(null, auth.deny);

		const r = call.request;
		if (!r.interview_id) {
			return callback(null, {
				ok: false,
				error_message: "interview_id is required",
			});
		}
		if (r.question_index === undefined || r.question_index === null) {
			return callback(null, {
				ok: false,
				error_message: "question_index is required",
			});
		}
		const answer = r.answer || "";
		if (!String(answer).trim()) {
			return callback(null, {
				ok: false,
				error_message: "answer is required",
			});
		}

		const interview = await Interview.findOne({
			_id: r.interview_id,
			is_deleted: false,
		});
		if (!interview) {
			return callback(null, {
				ok: false,
				error_message: "Interview not found",
			});
		}
		if (interview.status !== "in_progress") {
			return callback(null, {
				ok: false,
				error_message: "Interview not active",
			});
		}
		if (interview.current_question_index !== r.question_index) {
			return callback(null, {
				ok: false,
				error_message:
					"question_index must match current_question_index (stale client?)",
			});
		}

		let result;
		try {
			result = await processCandidateAnswer(interview, answer);
		} catch (e) {
			if (e.code === "NO_QUESTION") {
				return callback(null, {
					ok: false,
					error_message: "No current question",
				});
			}
			throw e;
		}

		const ev = result.evaluation || {};
		const base = {
			ok: true,
			score: Math.round(Number(ev.score) || 0),
			evaluation: String(ev.evaluation || ""),
			needs_follow_up: false,
			follow_up_question: "",
			outcome: result.outcome,
			interview_completed: false,
			current_question_index: result.current_question_index,
			total_questions: result.total_questions,
			next_question_text: "",
			next_question_category: "",
			next_question_type: "",
		};

		if (result.outcome === "follow_up") {
			base.needs_follow_up = true;
			base.follow_up_question = result.follow_up_question || "";
			return callback(null, base);
		}

		if (result.outcome === "pending_complete") {
			await finalizeInterviewDocument(interview);
			base.outcome = "completed";
			base.interview_completed = true;
			base.current_question_index = interview.current_question_index;
			return callback(null, base);
		}

		base.next_question_text = result.next_question_text || "";
		base.next_question_category = result.next_question_category || "";
		base.next_question_type = result.next_question_type || "";
		base.outcome = "next_question";
		return callback(null, base);
	} catch (err) {
		console.error("gRPC SubmitAnswerForScoring:", err);
		return callback(null, {
			ok: false,
			error_message: err.message || "submit failed",
		});
	}
};

const startGrpcServer = async (port) => {
	const server = new grpc.Server();

	server.addService(interviewControlProto.InterviewControl.service, {
		CreateInterviewSession: createInterviewSession,
		GetInterviewStatus: getInterviewStatus,
		SubmitAnswerForScoring: submitAnswerForScoring,
	});

	await new Promise((resolve, reject) => {
		server.bindAsync(
			`0.0.0.0:${port}`,
			grpc.ServerCredentials.createInsecure(),
			(err) => {
				if (err) reject(err);
				else resolve();
			},
		);
	});

	server.start();
	console.log(`gRPC InterviewControl listening on 0.0.0.0:${port}`);
	return server;
};

module.exports = { startGrpcServer };
