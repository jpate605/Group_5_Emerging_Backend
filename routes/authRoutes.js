const bcrypt = require("bcryptjs");
const express = require("express");
const router = express.Router();
const { generateToken, validateUserCredentials } = require("../utils/auth");
const User = require("../models/User");

router.post("/login", async (req, res) => {
  console.log("Request Body:", req.body);
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      throw new Error("Username and password are required");
    }

    const user = await validateUserCredentials(username, password);
    const { role, _id } = user;
    const token = generateToken(_id);
    res.json({ token, id: _id, role });
  } catch (error) {
    res.status(400).send(error.message);
  }
});

router.post("/register", async (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password || !role) {
      throw new Error("Username, password, and role are required");
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      throw new Error("User already exists");
    }

    const newUser = new User({ username, password, role });
    await newUser.save();

    const token = generateToken(newUser._id);
    res.json({ token, id: newUser._id, role });
  } catch (error) {
    res.status(400).send(error.message);
  }
});

module.exports = router;
