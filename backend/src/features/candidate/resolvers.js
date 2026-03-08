const { requireAuth } = require("../../middleware/auth");
const candidateService = require("./services/candidateService");

const serializeCandidate = (candidate) => {
	if (!candidate) return null;

	const obj = candidate.toObject ? candidate.toObject() : candidate;

	return {
		// GraphQL id
		id: candidate._id ? candidate._id.toString() : obj.id,
		// All scalar fields from the document
		...obj,
		// Normalize specific fields
		user_id: candidate.user_id?.toString
			? candidate.user_id.toString()
			: obj.user_id,
		createdAt: candidate.createdAt?.toISOString
			? candidate.createdAt.toISOString()
			: obj.createdAt,
		updatedAt: candidate.updatedAt?.toISOString
			? candidate.updatedAt.toISOString()
			: obj.updatedAt,
	};
};

const candidateResolvers = {
	Query: {
		candidate: async (parent, { id }, context) => {
			requireAuth(context);
			const candidate = await candidateService.getCandidateById(id);
			return serializeCandidate(candidate);
		},

		myCandidateProfile: async (parent, args, context) => {
			const user = requireAuth(context);
			const candidate = await candidateService.getCandidateByUserId(
				user._id.toString()
			);
			return serializeCandidate(candidate);
		},

		candidates: async (parent, { status, limit, offset }, context) => {
			requireAuth(context);
			const candidates = await candidateService.getCandidates({
				status,
				limit,
				offset,
			});
			return candidates.map(serializeCandidate);
		},
	},

	Mutation: {
		createCandidate: async (parent, { input }, context) => {
			const user = requireAuth(context);
			const candidate = await candidateService.createCandidate(
				input,
				user._id.toString()
			);
			return serializeCandidate(candidate);
		},

		updateCandidate: async (parent, { id, input }, context) => {
			const user = requireAuth(context);
			const candidate = await candidateService.updateCandidate(
				id,
				input,
				user._id.toString()
			);
			return serializeCandidate(candidate);
		},

		deleteCandidate: async (parent, { id }, context) => {
			const user = requireAuth(context);
			return await candidateService.deleteCandidate(
				id,
				user._id.toString()
			);
		},
	},
};

module.exports = candidateResolvers;
