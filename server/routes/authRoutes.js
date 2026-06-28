const express   = require("express");
const router    = express.Router();
const rateLimit = require("express-rate-limit");
const {
  register,
  login,
  verifyLoginOTP,
  getMe,
  changePassword,
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");

// ─── Auth Rate Limiter ────────────────────────────────────
// Stricter than the general API limiter: 20 requests per 15 min per IP.
// Protects register, login, and OTP verify from brute-force attacks.
const authLimiter = rateLimit({
  windowMs:       15 * 60 * 1000, // 15 minutes
  max:            20,
  message: {
    success: false,
    message: "Too many authentication attempts — please try again after 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders:   false,
});

// ─── Public Routes ────────────────────────────────────────

// POST /api/auth/register          — create account + send signup OTP
router.post("/register",          authLimiter, register);

// POST /api/auth/login             — verify credentials + send 2FA OTP
router.post("/login",             authLimiter, login);

// POST /api/auth/login/verify-otp  — verify 2FA OTP and receive JWT
router.post("/login/verify-otp",  authLimiter, verifyLoginOTP);

// ─── Protected Routes ─────────────────────────────────────

// GET  /api/auth/me                — get current authenticated user
router.get("/me", protect, getMe);

// PUT  /api/auth/change-password   — change password (requires current password)
router.put("/change-password", protect, changePassword);

module.exports = router;
