const { gql } = require("apollo-server-express");

const recruiterTypeDefs = gql`
	type Recruiter {
		id: ID!
		first_name: String!
		last_name: String!
		full_name: String!
		email: String!
		contact_number: String
		company_id: ID!
		verification_status: VerificationStatus!
		is_deleted: Boolean!
		user_id: ID!
		createdAt: String!
		updatedAt: String!
	}

	enum VerificationStatus {
		pending
		verified
		rejected
	}

	input RecruiterInput {
		first_name: String!
		last_name: String!
		email: String!
		contact_number: String
		company_id: ID!
	}

	input RecruiterUpdateInput {
		first_name: String
		last_name: String
		contact_number: String
		company_id: ID
		verification_status: VerificationStatus
	}

	type Query {
		recruiter(id: ID!): Recruiter
		myRecruiterProfile: Recruiter
		recruiters(
			verification_status: VerificationStatus
			limit: Int
			offset: Int
		): [Recruiter!]!
	}

	type Mutation {
		createRecruiter(input: RecruiterInput!): Recruiter!
		updateRecruiter(id: ID!, input: RecruiterUpdateInput!): Recruiter!
		deleteRecruiter(id: ID!): Boolean!
		updateRecruiterVerification(
			id: ID!
			verification_status: VerificationStatus!
		): Recruiter!
	}
`;

module.exports = recruiterTypeDefs;
