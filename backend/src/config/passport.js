require("dotenv").config();

const passport = require("passport");
const { Strategy: JwtStrategy, ExtractJwt } = require("passport-jwt");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const userService = require("../features/user/services/userService");

// JWT Strategy
passport.use(
	new JwtStrategy(
		{
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			secretOrKey: process.env.JWT_SECRET,
		},
		async (payload, done) => {
			try {
				const user = await userService.getSingleUser({
					_id: payload.userId,
				});

				if (!user) {
					return done(null, false);
				}

				done(null, user);
			} catch (error) {
				done(error, false);
			}
		}
	)
);

// Google Strategy (only initialize if credentials are provided)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
	passport.use(
		new GoogleStrategy(
			{
				clientID: process.env.GOOGLE_CLIENT_ID,
				clientSecret: process.env.GOOGLE_CLIENT_SECRET,
				callbackURL:
					process.env.GOOGLE_CALLBACK_URL ||
					"http://localhost:4000/auth/google/callback",
			},
			async (accessToken, refreshToken, profile, done) => {
				try {
					// Check if user exists with this google_id
					let user = await userService.getSingleUser({
						google_id: profile.id,
						is_deleted: false,
					});

					// If user doesn't exist, check by email
					if (!user && profile.emails && profile.emails.length > 0) {
						user = await userService.getSingleUser({
							email: profile.emails[0].value,
							is_deleted: false,
						});

						// If user exists with email but no google_id, link accounts
						if (user) {
							user.google_id = profile.id;
							user.profile_pic =
								profile?.photos?.[0]?.value || user.profile_pic;
							await user.save();
						}
					}

					// Return user with profile data for later use
					if (user) {
						user.googleProfile = {
							email: profile.emails[0].value,
							picture: profile?.photos?.[0]?.value,
						};
					}

					done(null, user || false);
				} catch (err) {
					done(err, false);
				}
			}
		)
	);
	console.log("✅ Google OAuth configured");
} else {
	console.log(
		"⚠️  Google OAuth not configured - add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env to enable"
	);
}

module.exports = passport;
