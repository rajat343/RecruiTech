const { gql } = require("apollo-server-express");

const candidateTypeDefs = gql`
	type Candidate {
		id: ID!
		first_name: String!
		last_name: String!
		full_name: String!
		email: String!
		phone_number: String
		github_url: String
		leetcode_url: String
		portfolio_url: String
		other_links: [String]
		resume_url: String
		profile_summary: String

		authorized_us: Boolean
		authorized_uk: Boolean
		authorized_canada: Boolean
		requires_sponsorship: Boolean

		ethnicity: String
		disability: String
		veteran: Boolean
		lgbtq: Boolean
		gender: String

		skills: [String]
		location: String
		dob: String

		status: CandidateStatus!
		is_deleted: Boolean!
		user_id: ID!
		createdAt: String!
		updatedAt: String!
	}


	type Education {
    	id: ID!
    	school_name: String!
    	major: String
    	degree_type: String
    	gpa: String
    	start_month: String
    	start_year: String
    	end_month: String
    	end_year: String
	}

	type Experience {
    	id: ID!
    	position_title: String!
    	company: String!
    	location: String!
    	experience_type: String!
    	start_month: String
    	start_year: String
    	end_month: String
    	end_year: String
    	description: String
	}

	enum CandidateStatus {
		actively_looking
		casually_looking
		not_looking
	}

	input CandidateInput {
		first_name: String!
		last_name: String!
		email: String!
		phone_number: String
		github_url: String
		leetcode_url: String
		portfolio_url: String
		other_links: [String]
		resume_url: String
		profile_summary: String

		authorized_us: Boolean
		authorized_uk: Boolean
		authorized_canada: Boolean
		requires_sponsorship: Boolean

		ethnicity: String
		disability: String
		veteran: Boolean
		lgbtq: Boolean
		gender: String

		skills: [String]
		location: String
		dob: String

		status: CandidateStatus
	}


	input CandidateUpdateInput {
		first_name: String
		last_name: String
		phone_number: String
		github_url: String
		leetcode_url: String
		portfolio_url: String
		other_links: [String]
		resume_url: String
		profile_summary: String

		authorized_us: Boolean
		authorized_uk: Boolean
		authorized_canada: Boolean
		requires_sponsorship: Boolean

		ethnicity: String
		disability: String
		veteran: Boolean
		lgbtq: Boolean
		gender: String

		skills: [String]
		location: String
		dob: String

		status: CandidateStatus
	}


	input EducationInput {
    	school_name: String!
    	major: String
    	degree_type: String
    	gpa: String
    	start_month: String
    	start_year: String
    	end_month: String
    	end_year: String
	}

	input ExperienceInput {
    	position_title: String!
    	company: String!
    	location: String!
    	experience_type: String!
    	start_month: String
    	start_year: String
    	end_month: String
    	end_year: String
    	description: String
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
		addEducation(candidateId: ID!, input: EducationInput!): Education
    	updateEducation(educationId: ID!, input: EducationInput!): Education
    	deleteEducation(educationId: ID!): Boolean

    	addExperience(candidateId: ID!, input: ExperienceInput!): Experience
    	updateExperience(experienceId: ID!, input: ExperienceInput!): Experience
    	deleteExperience(experienceId: ID!): Boolean
	}
`;

module.exports = candidateTypeDefs;
