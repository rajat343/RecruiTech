const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  googleId: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  name: { type: String }, 
  role: {
    type: String,
    enum: ["admin", "recruiter", "candidate"],
    default: "candidate"
  },
  signupMethod: {
    type: String,
    enum: ["google", "local"],
    default: "local"
  }
});

module.exports = mongoose.model("User", userSchema);
