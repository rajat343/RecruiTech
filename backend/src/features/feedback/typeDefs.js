const { gql } = require("apollo-server-express");

const feedbackTypeDefs = gql`
  type GrowthArea {
    area: String!
    current_level: String
    suggestion: String!
    resources: String
  }

  type FeedbackContent {
    summary: String!
    strengths: [String!]!
    growth_areas: [GrowthArea!]!
    next_steps: [String!]!
    encouragement: String!
  }

  type CandidateFeedback {
    id: ID!
    candidate_id: String!
    job_id: String!
    status: String!
    feedback: FeedbackContent
    created_at: String
  }

  extend type Query {
    rejectionFeedback(candidate_id: String!, job_id: String!): CandidateFeedback
  }
`;

module.exports = feedbackTypeDefs;
