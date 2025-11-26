require("dotenv").config();
const express = require("express");
const { ApolloServer } = require("apollo-server-express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const connectDatabase = require("./config/database");
const { createContext } = require("./middleware/auth");

// Import type definitions
const userTypeDefs = require("./features/user/typeDefs");
const candidateTypeDefs = require("./features/candidate/typeDefs");
const recruiterTypeDefs = require("./features/recruiter/typeDefs");
const companyTypeDefs = require("./features/company/typeDefs");
const jobTypeDefs = require("./features/job/typeDefs");

// Import resolvers
const userResolvers = require("./features/user/resolvers");
const candidateResolvers = require("./features/candidate/resolvers");
const recruiterResolvers = require("./features/recruiter/resolvers");
const companyResolvers = require("./features/company/resolvers");
const jobResolvers = require("./features/job/resolvers");

// Initialize Express app
const app = express();

// Security middleware - configure helmet to allow GraphQL Playground
app.use(
	helmet({
		contentSecurityPolicy:
			process.env.NODE_ENV === "production" ? undefined : false, // Disable CSP in development for GraphQL Playground
		crossOriginEmbedderPolicy: false,
	})
);

// CORS configuration - allow GraphQL Playground
const corsOptions = {
	origin:
		process.env.NODE_ENV === "production"
			? process.env.FRONTEND_URL || "http://localhost:3000"
			: true, // Allow all origins in development for GraphQL Playground
	credentials: true,
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100, // limit each IP to 100 requests per windowMs
	message: "Too many requests from this IP, please try again later.",
});

app.use("/graphql", limiter);

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get("/health", (req, res) => {
	res.status(200).json({
		status: "OK",
		timestamp: new Date().toISOString(),
		uptime: process.uptime(),
	});
});

// Apollo Server setup
const server = new ApolloServer({
	typeDefs: [
		userTypeDefs,
		candidateTypeDefs,
		recruiterTypeDefs,
		companyTypeDefs,
		jobTypeDefs,
	],
	resolvers: [
		userResolvers,
		candidateResolvers,
		recruiterResolvers,
		companyResolvers,
		jobResolvers,
	],
	context: createContext,
	formatError: (error) => {
		console.error("GraphQL Error:", error);
		return {
			message: error.message,
			code: error.extensions?.code || "INTERNAL_SERVER_ERROR",
		};
	},
	introspection: process.env.NODE_ENV !== "production",
	playground:
		process.env.NODE_ENV !== "production"
			? {
					settings: {
						"request.credentials": "include",
					},
			  }
			: false,
});

// Start server function
const startServer = async () => {
	try {
		// Connect to database
		await connectDatabase();

		// Start Apollo Server
		await server.start();
		server.applyMiddleware({ app, path: "/graphql", cors: corsOptions });

		// Start Express server
		const PORT = process.env.PORT || 4000;
		app.listen(PORT, () => {
			console.log(`🚀 Server running on http://localhost:${PORT}`);
			console.log(
				`📊 GraphQL endpoint: http://localhost:${PORT}${server.graphqlPath}`
			);
			console.log(
				`🎮 GraphQL Playground: http://localhost:${PORT}${server.graphqlPath}`
			);
		});
	} catch (error) {
		console.error("❌ Failed to start server:", error);
		process.exit(1);
	}
};

// Start the server
startServer();

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
	console.error("Unhandled Promise Rejection:", err);
	process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
	console.error("Uncaught Exception:", err);
	process.exit(1);
});
