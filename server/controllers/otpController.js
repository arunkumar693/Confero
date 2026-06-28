const bcrypt = require("bcryptjs");
const OTP = require("../models/OTP");
const User = require("../models/User");
const { sendOTPEmail } = require("../services/emailService");

// ─── Helper: generate a 6-digit OTP string ───────────────
// Math.random() gives uniform distribution; the +100000 ensures
// exactly 6 digits (no leading zeros). For production consider
// using crypto.randomInt(100000, 999999) instead.
const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

/**
 * @route   POST /api/otp/send
 * @desc    Generate and email an OTP for the given purpose
 * @access  Public
 * @body    { email: string, purpose: "signup"|"login"|"password-reset" }
 */
exports.sendOTP = async (req, res) => {
  try {
    const { email, purpose } = req.body;

    // ── Validate inputs ──────────────────────────────────
    if (!email || !purpose) {
      return res.status(400).json({ success: false, message: "Email and purpose are required" });
    }

    const validPurposes = ["signup", "login", "password-reset"];
    if (!validPurposes.includes(purpose)) {
      return res.status(400).json({ success: false, message: "Invalid OTP purpose" });
    }

    // ── User-existence check (prevents enumeration on auth flows) ─
    // For login and password-reset, the user must already exist.
    // We still return HTTP 200 to avoid revealing whether the email
    // is registered (security best practice).
    if (purpose === "login" || purpose === "password-reset") {
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return res.status(200).json({
          success: true,
          message: "If this email is registered, an OTP has been sent",
        });
      }
    }

    // ── Invalidate any previous OTP for this email+purpose ──
    // Ensures only the newest code is valid; prevents replay attacks.
    await OTP.deleteMany({ email: email.toLowerCase(), purpose });

    // ── Generate, hash, and persist the OTP ─────────────
    const otp = generateOTP();
    const hashedOTP = await bcrypt.hash(otp, 10);

    await OTP.create({
      email:     email.toLowerCase(),
      otp:       hashedOTP,
      purpose,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    // ── Send email ───────────────────────────────────────
    await sendOTPEmail(email, otp, purpose);

    res.status(200).json({ success: true, message: "OTP sent successfully" });
  } catch (err) {
    console.error("sendOTP error:", err);
    res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
};

/**
 * @route   POST /api/otp/verify
 * @desc    Verify an OTP code and consume it (single-use)
 * @access  Public
 * @body    { email: string, otp: string, purpose: string }
 */
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp, purpose } = req.body;

    if (!email || !otp || !purpose) {
      return res.status(400).json({
        success: false,
        message: "Email, OTP, and purpose are required",
      });
    }

    // ── Find the most recent, non-expired OTP record ─────
    const record = await OTP.findOne({
      email:     email.toLowerCase(),
      purpose,
      expiresAt: { $gt: new Date() }, // Must not be expired
    }).sort({ createdAt: -1 });

    if (!record) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired or is invalid. Please request a new one.",
      });
    }

    // ── Compare submitted OTP against the stored hash ────
    const isMatch = await bcrypt.compare(otp, record.otp);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Incorrect OTP code" });
    }

    // ── Consume the OTP (single-use) ─────────────────────
    await OTP.deleteOne({ _id: record._id });

    // ── Side-effect: mark user as verified ───────────────
    if (purpose === "signup" || purpose === "login") {
      await User.findOneAndUpdate(
        { email: email.toLowerCase() },
        { isVerified: true }
      );
    }

    res.status(200).json({ success: true, message: "OTP verified successfully" });
  } catch (err) {
    console.error("verifyOTP error:", err);
    res.status(500).json({ success: false, message: "OTP verification failed" });
  }
};
