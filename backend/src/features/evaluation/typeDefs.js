const { gql } = require("apollo-server-express");

const evaluationTypeDefs = gql`
  type CategoryScore {
    category: String!
    score: Float!
    weight: Float!
    evidence: [String!]!
  }

  type AgentResult {
    agent_name: String!
    category_scores: [CategoryScore!]!
    overall_score: Float!
    strengths: [String!]!
    weaknesses: [String!]!
  }

  type WeightProfile {
    name: String!
    reason: String!
    weights: JSON
  }

  type Evaluation {
    id: ID!
    candidate_id: String!
    job_id: String!
    final_score: Float!
    fit_level: String!
    weight_profile: WeightProfile
    agent_results: [AgentResult!]!
    top_strengths: [String!]!
    key_concerns: [String!]!
    interview_focus_areas: [String!]!
    summary: String!
    created_at: String
    dag_run_id: String
  }

  type EvaluationScore {
    candidate_id: String!
    final_score: Float!
    fit_level: String!
  }

  scalar JSON

  type Query {
    evaluation(candidate_id: String!, job_id: String!): Evaluation
    evaluationScores(job_id: String!, candidate_ids: [String!]!): [EvaluationScore!]!
  }

  type Mutation {
    triggerEvaluation(candidate_id: String!, job_id: String!): Boolean!
  }
`;

module.exports = evaluationTypeDefs;
