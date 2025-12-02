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

  input JobUpdateInput {
    title: String
    description: String
    employment_type: EmploymentType
    experience_level: ExperienceLevel
    location_type: LocationType
    location: String
    salary_min: Int
    salary_max: Int
    salary_currency: String
    skills: [String!]
    apply_url: String
    is_active: Boolean
  }

  # Search-specific types
  type JobSearchResult {
    jobs: [SearchedJob!]!
    total: Int!
    page: Int!
    size: Int!
    total_pages: Int!
    aggregations: SearchAggregations
  }

  type SearchedJob {
    id: ID!
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
    company_id: ID!
    company_name: String
    recruiter_id: ID!
    is_active: Boolean!
    created_at: String!
    updated_at: String!
    apply_url: String
    salary_range: String
    score: Float
  }

  type SearchAggregations {
    locations: [AggregationBucket!]!
    employment_types: [AggregationBucket!]!
    experience_levels: [AggregationBucket!]!
    location_types: [AggregationBucket!]!
    skills: [AggregationBucket!]!
    salary_ranges: [AggregationBucket!]!
  }

  type AggregationBucket {
    key: String!
    doc_count: Int!
  }

  type JobSuggestion {
    text: String!
    score: Float!
  }

  input JobSearchFilters {
    query: String
    location: String
    employment_type: [EmploymentType!]
    experience_level: [ExperienceLevel!]
    location_type: [LocationType!]
    skills: [String!]
    salary_min: Int
    salary_max: Int
    company_id: ID
    sort_by: JobSortBy
    page: Int
    size: Int
  }

  enum JobSortBy {
    relevance
    date_desc
    date_asc
    salary_desc
    salary_asc
  }

  type Query {
    jobs(limit: Int, offset: Int): [Job!]!
    myJobPosts(limit: Int, offset: Int): [Job!]!
    job(id: ID!): Job
    
    # Advanced job search with Elasticsearch
    searchJobs(filters: JobSearchFilters!): JobSearchResult!
    
    # Job suggestions for autocomplete
    jobSuggestions(query: String!, field: String): [JobSuggestion!]!
  }

  type Mutation {
    createJob(input: JobInput!): Job!
    updateJob(id: ID!, input: JobUpdateInput!): Job!
    deleteJob(id: ID!): Boolean!
    
    # Elasticsearch management (admin only)
    reindexAllJobs: Boolean!
  }
`;

module.exports = jobTypeDefs;
