const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const OTP = require("../models/OTP");
const { sendOTPEmail } = require("../services/emailService");

// ─── Helper: sign a JWT ───────────────────────────────────
// Payload carries id and username so the socket handler can
// authenticate without a DB round-trip on every event.
const signToken = (userId, username) =>
  jwt.sign({ id: userId, username }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

// ─── Helper: send a token + user object response ─────────
// Centralises the auth success response format so it's consistent
// across register (after OTP verify), login (2FA bypass fallback),
// and verifyLoginOTP endpoints.
const sendTokenResponse = (user, statusCode, res) => {
  const token = signToken(user._id, user.username);
  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id:          user._id,
      username:    user.username,
      email:       user.email,
      avatar:      user.avatar,
      bio:         user.bio,
      displayName: user.displayName,
      isVerified:  user.isVerified,
      theme:       user.theme,
    },
  });
};

// ─── Helper: generate a 6-digit OTP ──────────────────────
const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

/**
 * @route   POST /api/auth/register
 * @desc    Create a new user account, then send a signup OTP
 * @access  Public
 * @body    { username, email, password }
 */
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // ── Basic presence validation ─────────────────────────
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    if (typeof username !== "string" || username.length < 3 || username.length > 30) {
      return res.status(400).json({ success: false, message: "Username must be 3–30 characters" });
    }

    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
    }

    // ── Duplicate check ───────────────────────────────────
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }],
    });

    if (existingUser) {
      const field = existingUser.email === email.toLowerCase() ? "email" : "username";
      return res.status(409).json({
        success: false,
        message: `An account with this ${field} already exists`,
      });
    }

    // ── Create user (unverified until OTP confirmed) ──────
    const user = await User.create({ username, email, password, isVerified: false });

    // ── Send signup OTP ───────────────────────────────────
    // Failures here should NOT roll back registration — the user can
    // re-request an OTP via /api/otp/send.
    try {
      const otp = generateOTP();
      const hashedOTP = await bcrypt.hash(otp, 10);

      await OTP.create({
        email:     email.toLowerCase(),
        otp:       hashedOTP,
        purpose:   "signup",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      await sendOTPEmail(email, otp, "signup");
    } catch (emailErr) {
      console.error("Signup OTP email failed:", emailErr.message);
    }

    res.status(201).json({
      success:     true,
      message:     "Account created! Please check your email for a verification code.",
      userId:      user._id,
      email:       user.email,
      requiresOTP: true,
    });
  } catch (err) {
    // Mongoose validation errors (schema-level)
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(". ") });
    }
    console.error("Register error:", err);
    return res.status(500).json({ success: false, message: "Server error during registration" });
  }
};

/**
 * @route   POST /api/auth/login
 * @desc    Verify credentials, then send a 2FA login OTP
 * @access  Public
 * @body    { email, password }
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    // Fetch password field (excluded by default via select: false in schema)
    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");

    // Use identical error message for missing user and wrong password
    // to prevent user-enumeration attacks
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    // ── Send 2FA OTP ──────────────────────────────────────
    try {
      // Clear any existing login OTP for this user first
      await OTP.deleteMany({ email: email.toLowerCase(), purpose: "login" });

      const otp = generateOTP();
      const hashedOTP = await bcrypt.hash(otp, 10);

      await OTP.create({
        email:     email.toLowerCase(),
        otp:       hashedOTP,
        purpose:   "login",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      await sendOTPEmail(email, otp, "login");
    } catch (emailErr) {
      // If the email service is down, fall back to issuing the token
      // directly so users aren't locked out. Log for monitoring.
      console.error("Login OTP email failed — issuing token directly:", emailErr.message);
      return sendTokenResponse(user, 200, res);
    }

    // Credentials verified — tell the client to collect the OTP
    res.status(200).json({
      success:     true,
      message:     "Credentials verified. Please check your email for a login code.",
      requiresOTP: true,
      email:       user.email,
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ success: false, message: "Server error during login" });
  }
};

/**
 * @route   POST /api/auth/login/verify-otp
 * @desc    Verify the 2FA OTP and issue a JWT
 * @access  Public
 * @body    { email, otp }
 */
exports.verifyLoginOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email and OTP are required" });
    }

    // ── Find the non-expired OTP ──────────────────────────
    const record = await OTP.findOne({
      email:     email.toLowerCase(),
      purpose:   "login",
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!record) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please log in again.",
      });
    }

    // ── Compare ───────────────────────────────────────────
    const isMatch = await bcrypt.compare(otp, record.otp);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Incorrect OTP code" });
    }

    // ── Consume OTP (single-use) ──────────────────────────
    await OTP.deleteOne({ _id: record._id });

    // ── Mark user verified and return JWT ─────────────────
    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      { isVerified: true },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    console.error("verifyLoginOTP error:", err);
    res.status(500).json({ success: false, message: "OTP verification failed" });
  }
};

/**
 * @route   GET /api/auth/me
 * @desc    Return the currently authenticated user's data
 * @access  Private — requires valid JWT
 */
exports.getMe = async (req, res) => {
  // req.user is attached by the `protect` middleware
  const user = await User.findById(req.user.id).select("-password");
  res.status(200).json({ success: true, user });
};

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change the authenticated user's password
 * @access  Private
 * @body    { currentPassword, newPassword }
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Both current and new passwords are required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters",
      });
    }

    // Re-fetch with password field (excluded from protect middleware's query)
    const user = await User.findById(req.user.id).select("+password");

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Current password is incorrect" });
    }

    // Setting user.password triggers the pre-save bcrypt hook
    user.password = newPassword;
    await user.save();

    res.status(200).json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    console.error("changePassword error:", err);
    res.status(500).json({ success: false, message: "Failed to change password" });
  }
};
