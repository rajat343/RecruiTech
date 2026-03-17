const { requireAuth } = require("../../middleware/auth");
const { GraphQLScalarType, Kind } = require("graphql");
const { sendEvaluationRequest } = require("../../utils/kafkaProducer");

// Connect directly to the evaluations collection (written by Airflow)
let db;
const getDb = () => {
  if (!db) {
    const mongoose = require("mongoose");
    db = mongoose.connection.db;
  }
  return db;
};

const JSONScalar = new GraphQLScalarType({
  name: "JSON",
  description: "Arbitrary JSON value",
  serialize: (value) => value,
  parseValue: (value) => value,
  parseLiteral: (ast) => {
    if (ast.kind === Kind.STRING) return JSON.parse(ast.value);
    return null;
  },
});

const evaluationResolvers = {
  JSON: JSONScalar,
  Query: {
    evaluationScores: async (_, { job_id, candidate_ids }, context) => {
      requireAuth(context);
      const database = getDb();
      const docs = await database
        .collection("evaluations")
        .find(
          { job_id, candidate_id: { $in: candidate_ids } },
          { projection: { candidate_id: 1, final_score: 1, fit_level: 1 } }
        )
        .toArray();

      return docs.map((doc) => ({
        candidate_id: doc.candidate_id,
        final_score: doc.final_score,
        fit_level: doc.fit_level,
      }));
    },
    evaluation: async (_, { candidate_id, job_id }, context) => {
      requireAuth(context);
      const database = getDb();
      const doc = await database
        .collection("evaluations")
        .findOne(
          { candidate_id, job_id },
          { sort: { created_at: -1 } }
        );

      if (!doc) return null;

      return {
        id: doc._id.toString(),
        candidate_id: doc.candidate_id,
        job_id: doc.job_id,
        final_score: doc.final_score,
        fit_level: doc.fit_level,
        weight_profile: doc.weight_profile || null,
        agent_results: (doc.agent_results || []).map((ar) => ({
          agent_name: ar.agent_name,
          category_scores: (ar.category_scores || []).map((cs) => ({
            category: cs.category,
            score: cs.score,
            weight: cs.weight,
            evidence: cs.evidence || [],
          })),
          overall_score: ar.overall_score,
          strengths: ar.strengths || [],
          weaknesses: ar.weaknesses || [],
        })),
        top_strengths: doc.top_strengths || [],
        key_concerns: doc.key_concerns || [],
        interview_focus_areas: doc.interview_focus_areas || [],
        summary: doc.summary || "",
        created_at: doc.created_at
          ? new Date(doc.created_at).toISOString()
          : null,
        dag_run_id: doc.dag_run_id || null,
      };
    },
  },
  Mutation: {
    triggerEvaluation: async (_, { candidate_id, job_id }, context) => {
      requireAuth(context);
      const mongoose = require("mongoose");
      const Candidate = require("../../models/candidate.schema");
      const Job = require("../../models/job.schema");

      const candidate = await Candidate.findById(candidate_id);
      if (!candidate) throw new Error("Candidate not found");

      const job = await Job.findById(job_id);
      if (!job) throw new Error("Job not found");

      const resumeUrl = candidate.resume_url || null;
      if (!resumeUrl) throw new Error("Candidate has no resume on file");

      // Check if evaluation already exists
      const database = getDb();
      const existing = await database
        .collection("evaluations")
        .findOne({ candidate_id, job_id });
      if (existing) throw new Error("Evaluation already exists for this candidate and job");

      await sendEvaluationRequest({
        candidate_id,
        job_id,
        job_description: job.description,
        resume_s3_url: resumeUrl,
        github_url: candidate.github_url || null,
        leetcode_url: candidate.leetcode_url || null,
      });

      return true;
    },
  },
};

module.exports = evaluationResolvers;
