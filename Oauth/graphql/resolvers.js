const bcrypt = require("bcrypt");
const User = require("../models/User");
const { createToken } = require("../utils/auth");

const resolvers = {
  Query: {
    me: async (_, __, { user }) => user
  },

  Mutation: {
    signup: async (_, { email, password, role }) => {
      const existingUser = await User.findOne({ email });
      if (existingUser) throw new Error("Email already exists");

      const hashed = await bcrypt.hash(password, 10);
      const user = await User.create({
        email,
        password: hashed,
        role: role || "candidate",
        signupMethod: "local"
      });

      const token = createToken(user);
      return { token, user };
    },

    login: async (_, { email, password }) => {
      const user = await User.findOne({ email });
      if (!user) throw new Error("User not found");

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) throw new Error("Invalid credentials");

      const token = createToken(user);
      return { token, user };
    }
  }
};

module.exports = resolvers;
