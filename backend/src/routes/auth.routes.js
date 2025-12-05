const express = require("express");
const passport = require("../config/passport");
const authService = require("../features/user/services/authService");

const router = express.Router();

/**
 * @route   GET /auth/google
 * @desc    Initiate Google OAuth
 * @access  Public
 */
router.get(
	"/google",
	(req, res, next) => {
		// Store the role in session for later use
		const { role } = req.query;
		if (role && (role === "candidate" || role === "recruiter")) {
			req.session.oauthRole = role;
		}
		next();
	},
	passport.authenticate("google", {
		scope: ["profile", "email"],
		session: false,
	})
);

/**
 * @route   GET /auth/google/callback
 * @desc    Google OAuth callback
 * @access  Public
 */
router.get(
	"/google/callback",
	passport.authenticate("google", {
		session: false,
		failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth_failed`,
	}),
	async (req, res) => {
		try {
			const user = req.user;
			const role = req.session.oauthRole;

			// If user doesn't exist, we need to register
			if (!user) {
				// Redirect to frontend with Google profile data
				const googleProfile = req.authInfo || {};
				return res.redirect(
					`${process.env.FRONTEND_URL}/oauth-complete?` +
						`email=${encodeURIComponent(
							googleProfile.email || ""
						)}` +
						`&picture=${encodeURIComponent(
							googleProfile.picture || ""
						)}` +
						`&role=${role || "candidate"}` +
						`&needsRegistration=true`
				);
			}

			// User exists, generate token and redirect
			const authPayload = await authService.loginWithOAuth(user);

			// Clear the role from session
			delete req.session.oauthRole;

			// Redirect to frontend with token
			res.redirect(
				`${process.env.FRONTEND_URL}/oauth-complete?` +
					`token=${authPayload.token}` +
					`&role=${authPayload.user.role}`
			);
		} catch (error) {
			console.error("OAuth callback error:", error);
			res.redirect(
				`${process.env.FRONTEND_URL}/login?error=${encodeURIComponent(
					error.message
				)}`
			);
		}
	}
);

/**
 * @route   POST /auth/google/register
 * @desc    Complete Google OAuth registration
 * @access  Public
 */
router.post("/google/register", async (req, res) => {
	try {
		const { google_id, email, role, profile_pic } = req.body;

		if (!google_id || !email || !role) {
			return res.status(400).json({
				error: "google_id, email, and role are required",
			});
		}

		if (role !== "candidate" && role !== "recruiter") {
			return res.status(400).json({
				error: "role must be either 'candidate' or 'recruiter'",
			});
		}

		const authPayload = await authService.registerWithOAuth(
			google_id,
			email,
			role,
			profile_pic
		);

		res.status(201).json(authPayload);
	} catch (error) {
		console.error("OAuth registration error:", error);
		res.status(400).json({ error: error.message });
	}
});

module.exports = router;
