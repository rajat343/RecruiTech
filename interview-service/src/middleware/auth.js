const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

const extractTokenFromHeader = (authHeader) => {
	if (!authHeader) return null;
	const parts = authHeader.split(" ");
	if (parts.length !== 2 || parts[0] !== "Bearer") return null;
	return parts[1];
};

const verifyToken = (token) => {
	try {
		return jwt.verify(token, JWT_SECRET);
	} catch (error) {
		throw new Error("Invalid or expired token");
	}
};

const requireAuthExpress = (req, res, next) => {
	try {
		const token = extractTokenFromHeader(req.headers.authorization);
		if (!token) {
			return res.status(401).json({ error: "Authentication required" });
		}
		const decoded = verifyToken(token);
		req.user = decoded;
		next();
	} catch (err) {
		return res.status(401).json({ error: "Invalid or expired token" });
	}
};

const authenticateSocket = (socket, next) => {
	try {
		const token =
			socket.handshake.auth?.token ||
			socket.handshake.headers?.authorization?.replace("Bearer ", "");
		if (!token) {
			return next(new Error("Authentication required"));
		}
		const decoded = verifyToken(token);
		socket.user = decoded;
		next();
	} catch (err) {
		next(new Error("Invalid or expired token"));
	}
};

module.exports = {
	verifyToken,
	extractTokenFromHeader,
	requireAuthExpress,
	authenticateSocket,
};
