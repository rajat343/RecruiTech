const { gql } = require("apollo-server-express");

const applicationTypeDefs = gql`
  enum ApplicationStatus {
    pending
    reviewed
    shortlisted
    rejected
    hired
  }

  type Application {
    id: ID!
    job_id: ID!
    candidate_id: ID!
    user_id: ID!
    status: ApplicationStatus!
    cover_letter: String
    resume_url: String
    is_deleted: Boolean!
    createdAt: String!
    updatedAt: String!
    job: Job
    candidate: Candidate
  }

  input ApplyInput {
    job_id: ID!
    cover_letter: String
    resume_url: String
  }

  type Query {
    myApplications(limit: Int, offset: Int): [Application!]!
    applicationsForJob(job_id: ID!, limit: Int, offset: Int): [Application!]!
    applicationCountForJob(job_id: ID!): Int!
    myApplicationCount: Int!
    hasApplied(job_id: ID!): Boolean!
  }

  type Mutation {
    applyToJob(input: ApplyInput!): Application!
    updateApplicationStatus(id: ID!, status: ApplicationStatus!): Application!
    withdrawApplication(id: ID!): Application!
  }
`;

module.exports = applicationTypeDefs;
