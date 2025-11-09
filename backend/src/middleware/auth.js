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

module.exports = {
	createContext,
	requireAuth,
	requireAdmin,
};
