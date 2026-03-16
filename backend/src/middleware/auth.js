require("dotenv").config();

const { verifyToken, extractTokenFromHeader } = require("../utils/jwt");
const User = require("../models/user.schema");

const createContext = async ({ req }) => {
	let user = null;
	try {
		const token = extractTokenFromHeader(req.headers.authorization);
		if (token) {
			const decoded = verifyToken(token);
			user = await User.findById(decoded.id).select("-password");
			if (user && user.is_deleted) {
				user = null;
			}
		}
	} catch (error) {
		console.error("Auth error:", error.message);
	}
	return {
		user,
		isAuthenticated: !!user,
	};
};

const requireAuth = (context) => {
	if (!context.isAuthenticated) {
		throw new Error("Authentication required");
	}
	return context.user;
};

const requireAdmin = (context) => {
	const user = requireAuth(context);
	if (!user.is_admin) {
		throw new Error("Admin access required");
	}
	return user;
};

/**
 * Express middleware: verify JWT from Authorization header and set req.user.
 * Use for REST routes (e.g. /upload/resume). Sends 401 if missing or invalid token.
 */
const requireAuthExpress = async (req, res, next) => {
	try {
		const token = extractTokenFromHeader(req.headers.authorization);
		if (!token) {
			return res.status(401).json({ error: "Authentication required" });
		}
		const decoded = verifyToken(token);
		const user = await User.findById(decoded.id).select("-password");
		if (!user || user.is_deleted) {
			return res.status(401).json({ error: "Authentication required" });
		}
		req.user = user;
		next();
	} catch (err) {
		return res.status(401).json({ error: "Authentication required" });
	}
};

module.exports = {
	createContext,
	requireAuth,
	requireAdmin,
	requireAuthExpress,
};
