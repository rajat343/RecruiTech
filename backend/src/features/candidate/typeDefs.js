const { gql } = require("apollo-server-express");

const candidateTypeDefs = gql`
	type Candidate {
		id: ID!
		first_name: String!
		last_name: String!
		full_name: String!
		email: String!
		contact_number: String
		github_url: String
		leetcode_url: String
		portfolio_url: String
		resume_url: String
		profile_summary: String
		status: CandidateStatus!
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

	input CandidateInput {
		first_name: String!
		last_name: String!
		email: String!
		contact_number: String
		github_url: String
		leetcode_url: String
		portfolio_url: String
		resume_url: String
		profile_summary: String
		status: CandidateStatus
	}

	input CandidateUpdateInput {
		first_name: String
		last_name: String
		contact_number: String
		github_url: String
		leetcode_url: String
		portfolio_url: String
		resume_url: String
		profile_summary: String
		status: CandidateStatus
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
