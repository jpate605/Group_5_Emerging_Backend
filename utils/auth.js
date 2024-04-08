const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "1h" });
};

const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

const validateUserCredentials = async (username, password) => {
  console.log("Username:", username);
  const user = await User.findOne({ username });
  console.log("User:", user);
  if (!user) {
    console.log("User not found for username:", username);
    throw new Error("User not found");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error("Invalid credentials");
  }

  return user;
};

module.exports = { generateToken, verifyToken, validateUserCredentials };
