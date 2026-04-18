require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const connectDatabase = require("./config/database");
const { connectProducer } = require("./config/kafka");
const { startGrpcServer } = require("./grpc/server");
const { authenticateSocket } = require("./middleware/auth");
const registerInterviewHandlers = require("./socket/interviewHandler");
const interviewRoutes = require("./routes/interview.routes");

const app = express();
const server = http.createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const io = new Server(server, {
	cors: {
		origin: FRONTEND_URL,
		methods: ["GET", "POST"],
		credentials: true,
	},
	pingTimeout: 60000,
	pingInterval: 25000,
	maxHttpBufferSize: 5 * 1024 * 1024,
});

app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());

app.get("/health", (req, res) => {
	res.json({
		status: "OK",
		service: "interview-service",
		timestamp: new Date().toISOString(),
		uptime: process.uptime(),
	});
});

app.use("/api/interviews", interviewRoutes);

io.use(authenticateSocket);

io.on("connection", (socket) => {
	console.log(`Client connected: ${socket.user.id}`);
	registerInterviewHandlers(io, socket);

	socket.on("disconnect", (reason) => {
		console.log(`Client disconnected: ${socket.user.id} (${reason})`);
	});
});

const PORT = process.env.INTERVIEW_SERVICE_PORT || 5001;
const GRPC_ENABLED = process.env.GRPC_ENABLED !== "false";
const GRPC_PORT = parseInt(process.env.GRPC_PORT || "50051", 10);

const start = async () => {
	try {
		await connectDatabase();
		await connectProducer();

		server.listen(PORT, () => {
			console.log(
				`Interview service running on http://localhost:${PORT}`,
			);
			console.log(`WebSocket server ready`);
			console.log(`REST API at http://localhost:${PORT}/api/interviews`);
		});

		if (GRPC_ENABLED) {
			await startGrpcServer(GRPC_PORT);
		} else {
			console.log("gRPC disabled (GRPC_ENABLED=false)");
		}
	} catch (error) {
		console.error("Failed to start interview service:", error);
		process.exit(1);
	}
};

start();

process.on("unhandledRejection", (err) => {
	console.error("Unhandled Promise Rejection:", err);
});

process.on("uncaughtException", (err) => {
	console.error("Uncaught Exception:", err);
	process.exit(1);
});
