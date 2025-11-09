const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
	{
		email: { type: String, required: true, unique: true },
		password: { type: String },
		google_id: { type: String, sparse: true, unique: true },
		role: {
			type: String,
			enum: ["recruiter", "candidate", "admin"],
			required: true,
		},
		profile_pic: { type: String },
		is_admin: { type: Boolean, default: false },
		admin_metadata: { type: Object },
		metadata: { type: Object },
		is_deleted: { type: Boolean, default: false },
	},
	{
		timestamps: true,
	}
);

userSchema.pre("save", async function (next) {
	if (this.isModified("password") && this.password) {
		this.password = await bcrypt.hash(this.password, 10);
	}
	next();
});

userSchema.methods.comparePassword = async function (password) {
	if (!this.password) {
		return false;
	}
	return await bcrypt.compare(password, this.password);
};

const User = mongoose.model("User", userSchema);

module.exports = User;
