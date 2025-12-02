const { requireAuth } = require("../../middleware/auth");
const candidateService = require("./services/candidateService");
const educationService = require("./services/educationService");
const experienceService = require("./services/experienceService");

const mapCandidate = (candidate) => ({
	id: candidate._id.toString(),
	first_name: candidate.first_name,
	last_name: candidate.last_name,
	full_name: `${candidate.first_name} ${candidate.last_name}`,
	email: candidate.email,
	phone_number: candidate.phone_number,
	github_url: candidate.github_url,
	leetcode_url: candidate.leetcode_url,
	portfolio_url: candidate.portfolio_url,
	other_links: candidate.other_links,
	resume_url: candidate.resume_url,
	profile_summary: candidate.profile_summary,
	status: candidate.status,
	authorized_us: candidate.authorized_us,
	authorized_uk: candidate.authorized_uk,
	authorized_canada: candidate.authorized_canada,
	requires_sponsorship: candidate.requires_sponsorship,
	location: candidate.location,
	dob: candidate.dob,
	skills: candidate.skills,
	ethnicity: candidate.ethnicity,
	disability: candidate.disability,
	veteran: candidate.veteran,
	lgbtq: candidate.lgbtq,
	gender: candidate.gender,
	is_deleted: candidate.is_deleted,
	user_id: candidate.user_id.toString(),
	createdAt: candidate.createdAt.toISOString(),
	updatedAt: candidate.updatedAt.toISOString(),
});

const candidateResolvers = {
	Query: {
		candidate: async (parent, { id }, context) => {
			requireAuth(context);
			const candidate = await candidateService.getCandidateById(id);
			return mapCandidate(candidate);
		},

		myCandidateProfile: async (parent, args, context) => {
			const user = requireAuth(context);
			const candidate = await candidateService.getCandidateByUserId(user._id.toString());
			return mapCandidate(candidate);
		},

		candidates: async (parent, { status, limit, offset }, context) => {
			requireAuth(context);
			const candidates = await candidateService.getCandidates({ status, limit, offset });
			return candidates.map(mapCandidate);
		},
	},

	Mutation: {
		createCandidate: async (parent, { input }, context) => {
			const user = requireAuth(context);
			const candidate = await candidateService.createCandidate(input, user._id.toString());
			return mapCandidate(candidate);
		},

		updateCandidate: async (parent, { id, input }, context) => {
			const user = requireAuth(context);
			const candidate = await candidateService.updateCandidate(id, input, user._id.toString());
			return mapCandidate(candidate);
		},

		deleteCandidate: async (parent, { id }, context) => {
			const user = requireAuth(context);
			return await candidateService.deleteCandidate(id, user._id.toString());
		},

		// EDUCATION
		addEducation: (_, { candidateId, input }, context) => {
			const user = requireAuth(context);
			return educationService.createEducation(candidateId, input, user._id.toString());
		},

		updateEducation: (_, { educationId, input }, context) => {
			const user = requireAuth(context);
			return educationService.updateEducation(educationId, input, user._id.toString());
		},

		deleteEducation: (_, { educationId }, context) => {
			const user = requireAuth(context);
			return educationService.deleteEducation(educationId, user._id.toString());
		},

		// EXPERIENCE
		addExperience: (_, { candidateId, input }, context) => {
			const user = requireAuth(context);
			return experienceService.createExperience(candidateId, input, user._id.toString());
		},

		updateExperience: (_, { experienceId, input }, context) => {
			const user = requireAuth(context);
			return experienceService.updateExperience(experienceId, input, user._id.toString());
		},

		deleteExperience: (_, { experienceId }, context) => {
			const user = requireAuth(context);
			return experienceService.deleteExperience(experienceId, user._id.toString());
		},
	},
};

module.exports = candidateResolvers;
