const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { register, login, getMe } = require("../controllers/authController");
const { protect } = require("../middleware/auth");

// Auth-specific limiter: stricter — 20 requests per 15 min per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: "Too many authentication attempts — please try again after 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public routes (Brute force protection enabled)
router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);

// Protected routes (General rate limit applies)
router.get("/me", protect, getMe);

module.exports = router;
