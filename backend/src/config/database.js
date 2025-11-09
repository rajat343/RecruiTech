const mongoose = require("mongoose");

const connectDatabase = async () => {
	try {
		const mongoUri = process.env.MONGODB_URL;
		if (!mongoUri) {
			throw new Error(
				"MONGODB_URL is not defined in environment variables"
			);
		}
		const options = {
			useNewUrlParser: true,
			useUnifiedTopology: true,
		};
		await mongoose.connect(mongoUri, options);
		console.log("MongoDB connected successfully");
		console.log(`Database: ${mongoose.connection.name}`);
		mongoose.connection.on("error", (err) => {
			console.error("MongoDB connection error:", err);
		});
		mongoose.connection.on("disconnected", () => {
			console.warn("MongoDB disconnected");
		});
		process.on("SIGINT", async () => {
			await mongoose.connection.close();
			console.log("MongoDB connection closed through app termination");
			process.exit(0);
		});
	} catch (error) {
		console.error("Database connection failed:", error.message);
		process.exit(1);
	}
};

module.exports = connectDatabase;
