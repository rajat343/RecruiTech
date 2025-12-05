const { gql } = require("apollo-server-express");

const userTypeDefs = gql`
	scalar JSON

	type User {
		id: ID!
		email: String!
		role: UserRole!
		profile_pic: String
		is_admin: Boolean!
		admin_metadata: JSON
		metadata: JSON
		is_deleted: Boolean!
		createdAt: String!
		updatedAt: String!
	}

	enum UserRole {
		recruiter
		candidate
	}

	type AuthPayload {
		token: String!
		user: User!
	}

	type Query {
		me: User
		user(id: ID!): User
		users(role: UserRole, limit: Int, offset: Int): [User!]!
	}

	type Mutation {
		# Email/Password Authentication
		register(
			email: String!
			password: String!
			role: UserRole!
		): AuthPayload!

		login(email: String!, password: String!): AuthPayload!

		# User Management
		updateUserRole(id: ID!, role: UserRole!): User!
		deleteUser(id: ID!): Boolean!
	}
`;

module.exports = userTypeDefs;
