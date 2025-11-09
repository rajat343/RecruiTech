const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Generate JWT token from payload object
 * @param {Object} payload - Payload object with userId and email
 * @returns {String} JWT token
 */
const generateToken = (payload) => {
	const normalizedPayload = {
		id: payload.userId || payload.id,
		email: payload.email,
	};
	return jwt.sign(
		normalizedPayload,
		JWT_SECRET
		// { expiresIn: "1d" }
	);
};

const verifyToken = (token) => {
	try {
		return jwt.verify(token, JWT_SECRET);
	} catch (error) {
		throw new Error("Invalid or expired token");
	}
};

/**
 * Extract token from Authorization header
 * @param {String} authHeader - Authorization header value
 * @returns {String|null} Extracted token or null
 */
const extractTokenFromHeader = (authHeader) => {
	if (!authHeader) {
		return null;
	}

	const parts = authHeader.split(" ");
	if (parts.length !== 2 || parts[0] !== "Bearer") {
		return null;
	}

	return parts[1];
};

module.exports = {
	generateToken,
	verifyToken,
	extractTokenFromHeader,
};
