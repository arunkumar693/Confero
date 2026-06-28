const express    = require("express");
const router     = express.Router();
const rateLimit  = require("express-rate-limit");
const { sendOTP, verifyOTP } = require("../controllers/otpController");

// ─── OTP Rate Limiter ─────────────────────────────────────
// Very strict: 5 requests per 15 minutes per IP.
// Prevents brute-force OTP guessing and email spam.
const otpLimiter = rateLimit({
  windowMs:       15 * 60 * 1000, // 15 minutes
  max:            5,
  message: {
    success: false,
    message: "Too many OTP requests — please try again after 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders:   false,
});

// POST /api/otp/send    — generate and email an OTP
router.post("/send",   otpLimiter, sendOTP);

// POST /api/otp/verify  — verify an OTP code
router.post("/verify", otpLimiter, verifyOTP);

module.exports = router;
