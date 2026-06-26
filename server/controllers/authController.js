const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ─── Helper: generate a signed JWT ───────────────────────
// Includes both user ID and username in the payload so the
// socket handler can read the username without a DB lookup.
const signToken = (userId, username) =>
  jwt.sign({ id: userId, username }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

// ─── Helper: format a consistent success response ────────
const sendTokenResponse = (user, statusCode, res) => {
  const token = signToken(user._id, user.username);

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
    },
  });
};

/**
 * @route   POST /api/auth/register
 * @desc    Create a new user account
 * @access  Public
 */
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // ── Presence check ──────────────────────────────────
    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    // ── Length / format checks (defense in depth — also validated by Mongoose) ──
    if (typeof username !== "string" || username.length < 3 || username.length > 30) {
      return res
        .status(400)
        .json({ success: false, message: "Username must be 3–30 characters" });
    }

    if (typeof password !== "string" || password.length < 8) {
      return res
        .status(400)
        .json({ success: false, message: "Password must be at least 8 characters" });
    }

    // ── Duplicate check ─────────────────────────────────
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }],
    });

    if (existingUser) {
      const field =
        existingUser.email === email.toLowerCase() ? "email" : "username";
      return res
        .status(409)
        .json({ success: false, message: `An account with this ${field} already exists` });
    }

    // ── Create user (password hashed via pre-save hook) ─
    const user = await User.create({ username, email, password });

    sendTokenResponse(user, 201, res);
  } catch (err) {
    // Handle Mongoose validation errors
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res
        .status(400)
        .json({ success: false, message: messages.join(". ") });
    }
    console.error("Register error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error during registration" });
  }
};

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate a user and return a JWT
 * @access  Public
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required" });
    }

    // Explicitly select password (excluded by default in schema)
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+password"
    );

    if (!user) {
      // Use a generic message to prevent user enumeration
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    console.error("Login error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error during login" });
  }
};

/**
 * @route   GET /api/auth/me
 * @desc    Return the currently authenticated user
 * @access  Private (requires JWT)
 */
exports.getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user,
  });
};
