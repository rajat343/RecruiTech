const { gql } = require("apollo-server-express");

const companyTypeDefs = gql`
	type Company {
		id: ID!
		name: String!
		domain: String!
		is_verified: Boolean!
		is_deleted: Boolean!
		created_by: ID!
		createdAt: String!
		updatedAt: String!
	}

	input CompanyInput {
		name: String!
		domain: String!
	}

	input CompanyUpdateInput {
		name: String
		domain: String
		is_verified: Boolean
	}

	type Query {
		company(id: ID!): Company
		companies(is_verified: Boolean, limit: Int, offset: Int): [Company!]!
	}

	type Mutation {
		createCompany(input: CompanyInput!): Company!
		updateCompany(id: ID!, input: CompanyUpdateInput!): Company!
		deleteCompany(id: ID!): Boolean!
	}
`;

module.exports = companyTypeDefs;
