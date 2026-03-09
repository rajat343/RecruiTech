const { gql } = require("apollo-server-express");

const candidateTypeDefs = gql`
	type CandidateDemographics {
		race_ethnicity: String
		gender: String
		disability: String
	}

	type WorkExperience {
		title: String
		company: String
		start_date: String
		end_date: String
		is_current: Boolean
		description: String
	}

	type Education {
		school: String
		degree: String
		graduation_year: Int
	}

	type Candidate {
		id: ID!
		first_name: String!
		last_name: String!
		email: String!
		phone_number: String
		# Location
		location_city: String
		location_state: String
		location_country: String
		# Work eligibility
		work_authorized: Boolean
		sponsorship_needed: Boolean
		# Links
		linkedin_url: String
		github_url: String
		leetcode_url: String
		portfolio_url: String
		# Professional summary
		resume_url: String
		headline: String
		skills: [String!]
		profile_summary: String
		# Detailed work experience
		work_experiences: [WorkExperience!]
		# Detailed education
		educations: [Education!]
		# Status & meta
		status: CandidateStatus!
		demographics: CandidateDemographics
		is_deleted: Boolean!
		user_id: ID!
		createdAt: String!
		updatedAt: String!
	}

	enum CandidateStatus {
		actively_looking
		casually_looking
		not_looking
	}

	input CandidateDemographicsInput {
		race_ethnicity: String
		gender: String
		disability: String
	}

	input WorkExperienceInput {
		title: String
		company: String
		start_date: String
		end_date: String
		is_current: Boolean
		description: String
	}

	input EducationInput {
		school: String
		degree: String
		graduation_year: Int
	}

	input CandidateInput {
		first_name: String!
		last_name: String!
		email: String!
		phone_number: String
		# Location
		location_city: String
		location_state: String
		location_country: String
		# Work eligibility
		work_authorized: Boolean
		sponsorship_needed: Boolean
		# Links
		linkedin_url: String
		github_url: String
		leetcode_url: String
		portfolio_url: String
		# Professional summary
		resume_url: String
		headline: String
		skills: [String!]
		profile_summary: String
		# Detailed work experience
		work_experiences: [WorkExperienceInput!]
		# Detailed education
		educations: [EducationInput!]
		# Status & demographics
		status: CandidateStatus
		demographics: CandidateDemographicsInput
	}

	input CandidateUpdateInput {
		first_name: String
		last_name: String
		phone_number: String
		# Location
		location_city: String
		location_state: String
		location_country: String
		# Work eligibility
		work_authorized: Boolean
		sponsorship_needed: Boolean
		# Links
		linkedin_url: String
		github_url: String
		leetcode_url: String
		portfolio_url: String
		# Professional summary
		resume_url: String
		headline: String
		skills: [String!]
		profile_summary: String
		# Detailed work experience
		work_experiences: [WorkExperienceInput!]
		# Detailed education
		educations: [EducationInput!]
		# Status & demographics
		status: CandidateStatus
		demographics: CandidateDemographicsInput
	}

	type Query {
		candidate(id: ID!): Candidate
		myCandidateProfile: Candidate
		candidates(
			status: CandidateStatus
			limit: Int
			offset: Int
		): [Candidate!]!
	}

	type Mutation {
		createCandidate(input: CandidateInput!): Candidate!
		updateCandidate(id: ID!, input: CandidateUpdateInput!): Candidate!
		deleteCandidate(id: ID!): Boolean!
	}
`;

module.exports = candidateTypeDefs;
