const mongoose = require("mongoose");

const experienceSchema = new mongoose.Schema({
  candidateId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Candidate",
    required: true 
  },
  jobTitle: { type: String, required: true },
  companyName: { type: String, required: true },
  location: { type: String, required: true },
  experienceType: { type: String, required: true },
  startDate: {
    month: Number,
    year: Number
  },
  endDate: {
    month: Number,
    year: Number
  },
  description: String
}, { timestamps: true });

module.exports = mongoose.model("Experience", experienceSchema);
