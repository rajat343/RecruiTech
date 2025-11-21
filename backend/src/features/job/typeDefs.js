const { gql } = require("apollo-server-express");

const jobTypeDefs = gql`
  enum EmploymentType {
    full_time
    part_time
    contract
    internship
    freelance
  }

  enum ExperienceLevel {
    junior
    mid
    senior
    lead
  }

  enum LocationType {
    onsite
    remote
    hybrid
  }

  type Job {
    id: ID!
    recruiter_id: ID!
    company_id: ID!
    title: String!
    description: String!
    employment_type: EmploymentType!
    experience_level: ExperienceLevel!
    location_type: LocationType!
    location: String!
    salary_min: Int
    salary_max: Int
    salary_currency: String
    skills: [String!]!
    apply_url: String
    is_active: Boolean!
    is_deleted: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  input JobInput {
    title: String!
    description: String!
    employment_type: EmploymentType!
    experience_level: ExperienceLevel!
    location_type: LocationType!
    location: String!
    salary_min: Int
    salary_max: Int
    salary_currency: String
    skills: [String!]
    apply_url: String
    company_id: ID
  }

  type Query {
    jobs(limit: Int, offset: Int): [Job!]!
    myJobPosts(limit: Int, offset: Int): [Job!]!
  }

  type Mutation {
    createJob(input: JobInput!): Job!
  }
`;

module.exports = jobTypeDefs;
