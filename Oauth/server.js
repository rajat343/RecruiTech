require("dotenv").config();
const express = require("express");
const { ApolloServer } = require("apollo-server-express");
const mongoose = require("mongoose");
const passport = require("passport");
const session = require("express-session");
const cors = require("cors");
const typeDefs = require("./graphql/schema");
const resolvers = require("./graphql/resolvers");
const { getUserFromToken, createToken } = require("./utils/auth");
require("./config/passport")(passport);

const app = express();

app.use(cors());
//app.use(express.json());

mongoose
	.connect(process.env.MONGODB_URL)
	.then(() => console.log("✅ MongoDB connected"));

// Express session setup for Passport (Google OAuth)
app.use(session({ secret: "secret", resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

// Google OAuth routes
app.get(
	"/auth/google",
	passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
	"/auth/google/callback",
	passport.authenticate("google", { failureRedirect: "/" }),
	(req, res) => {
		const token = createToken(req.user);
		res.redirect(`http://localhost:3000/auth/success?token=${token}`);
	}
);

// Apollo GraphQL setup
async function startApolloServer() {
	const server = new ApolloServer({
		typeDefs,
		resolvers,
		context: async ({ req }) => {
			const token = req.headers.authorization?.split(" ")[1];
			const user = token ? await getUserFromToken(token) : null;
			return { user };
		},
	});

	await server.start();
	server.applyMiddleware({ app, path: "/graphql" });

	const PORT = process.env.PORT;
	app.listen(PORT, () =>
		console.log(`🚀 Server running at http://localhost:${PORT}/graphql`)
	);
}

startApolloServer();
