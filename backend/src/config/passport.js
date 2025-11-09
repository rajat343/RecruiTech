require("dotenv").config();

const passport = require("passport");
const { Strategy: JwtStrategy, ExtractJwt } = require("passport-jwt");
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
					_id: payload.id,
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

// Google Strategy
// passport.use(
// 	new GoogleStrategy(
// 		{
// 			clientID: process.env.GOOGLE_CLIENT_ID,
// 			clientSecret: process.env.GOOGLE_CLIENT_SECRET,
// 			callbackURL: process.env.GOOGLE_CALLBACK_URL,
// 		},
// 		async (accessToken, refreshToken, profile, done) => {
// 			try {
// 				let user = await userService.getSingleUser({
// 					google_id: profile.id,
// 					is_deleted: false,
// 				});
// 				if (!user) {
// 					user = await userService.createUser({
// 						first_name: profile.name.givenName,
// 						last_name: profile.name.familyName,
// 						email: profile.emails[0].value,
// 						google_id: profile.id,
// 						profile_pic: profile?.photos?.[0]?.value,
// 					});
// 				}
// 				done(null, user);
// 			} catch (err) {
// 				done(err, false);
// 			}
// 		}
// 	)
// );

module.exports = passport;
