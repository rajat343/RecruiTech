const mongoose = require("mongoose");

const educationSchema = new mongoose.Schema({
  candidateId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Candidate",
    required: true 
  },
  schoolName: { type: String, required: true },
  major: { type: String, required: true },
  degreeType: { type: String, required: true },
  gpa: Number,
  startDate: {
    month: Number,
    year: Number
  },
  endDate: {
    month: Number,
    year: Number
  }
}, { timestamps: true });

module.exports = mongoose.model("Education", educationSchema);
