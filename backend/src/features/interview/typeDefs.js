const { gql } = require("apollo-server-express");

const interviewTypeDefs = gql`
  enum InterviewStatus {
    scheduled
    in_progress
    completed
    expired
    cancelled
  }

  type InterviewQuestion {
    question_text: String!
    question_type: String!
    category: String
    candidate_answer: String
    ai_evaluation: String
    score: Float
  }

  type Interview {
    id: ID!
    application_id: ID!
    candidate_id: ID!
    user_id: ID!
    job_id: ID!
    interview_token: String!
    status: InterviewStatus!
    job_title: String
    questions: [InterviewQuestion!]
    current_question_index: Int
    total_questions: Int
    overall_score: Float
    overall_feedback: String
    strengths: [String!]
    improvements: [String!]
    recording_url: String
    started_at: String
    completed_at: String
    expires_at: String
    createdAt: String!
  }

  input SendAiInterviewInput {
    application_id: ID!
  }

  type Query {
    myInterviews: [Interview!]!
    interviewForApplication(application_id: ID!): Interview
  }

  type Mutation {
    sendAiInterview(input: SendAiInterviewInput!): Interview!
  }
`;

module.exports = interviewTypeDefs;
