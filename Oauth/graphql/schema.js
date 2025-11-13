const { gql } = require("apollo-server-express");

const typeDefs = gql`
  enum Role {
    admin
    recruiter
    candidate
  }

  type User {
    id: ID!
    email: String!
    name: String
    role: Role
    signupMethod: String
  }

  type AuthResponse {
    token: String
    user: User
  }

  type Query {
    me: User
  }

  type Mutation {
    signup(email: String!, password: String!, role: Role): AuthResponse
    login(email: String!, password: String!): AuthResponse
  }
`;

module.exports = typeDefs;
