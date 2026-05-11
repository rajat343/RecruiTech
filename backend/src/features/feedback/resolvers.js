const { requireAuth } = require("../../middleware/auth");
const Candidate = require("../../models/candidate.schema");

let db;
const getDb = () => {
  if (!db) {
    const mongoose = require("mongoose");
    db = mongoose.connection.db;
  }
  return db;
};

const feedbackResolvers = {
  Query: {
    rejectionFeedback: async (_, { candidate_id, job_id }, context) => {
      requireAuth(context);
      const user = context.user;

      const me = await Candidate.findOne({
        user_id: user._id.toString(),
        is_deleted: false,
      });
      if (!me) return null;

      const requestedCid = String(candidate_id || "").trim();
      const jid = String(job_id || "").trim();
      if (!jid) return null;

      // Always scope to the logged-in candidate (same id Airflow stores from applications).
      if (requestedCid && requestedCid !== me._id.toString()) {
        return null;
      }
      const effectiveCandidateId = me._id.toString();

      const database = getDb();
      const docs = await database
        .collection("candidate_feedback")
        .find({ candidate_id: effectiveCandidateId, job_id: jid })
        .sort({ created_at: -1 })
        .limit(1)
        .toArray();

      const doc = docs[0] || null;
      if (!doc) return null;

      return {
        id: doc._id.toString(),
        candidate_id: doc.candidate_id,
        job_id: doc.job_id,
        status: doc.status || "generating",
        feedback: doc.feedback || null,
        created_at: doc.created_at
          ? new Date(doc.created_at).toISOString()
          : null,
      };
    },
  },
};

module.exports = feedbackResolvers;
