const { requireAuth } = require("../../middleware/auth");

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
      const database = getDb();
      const doc = await database
        .collection("candidate_feedback")
        .findOne(
          { candidate_id, job_id },
          { sort: { created_at: -1 } }
        );

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
