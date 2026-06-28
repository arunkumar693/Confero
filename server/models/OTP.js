const mongoose = require("mongoose");

// ─── OTP Schema ───────────────────────────────────────────
// Stores hashed one-time passwords for email verification flows.
// Documents are automatically deleted by MongoDB's TTL mechanism
// when expiresAt is reached — no manual cleanup needed.
const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    // Stored as a bcrypt hash, NEVER plaintext
    otp: {
      type: String,
      required: true,
    },
    // Purpose controls which flow this OTP belongs to
    purpose: {
      type: String,
      enum: ["signup", "login", "password-reset"],
      required: true,
    },
    // Explicit expiry field for the TTL index and application-level checks
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// ─── TTL Index ────────────────────────────────────────────
// MongoDB automatically deletes documents once `expiresAt` is reached.
// expireAfterSeconds: 0 means "delete at the expiresAt moment exactly".
// This prevents OTP bloat without any cron job.
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ─── Lookup Index ─────────────────────────────────────────
// Fast lookups by email + purpose (used on every OTP verify call)
otpSchema.index({ email: 1, purpose: 1 });

module.exports = mongoose.model("OTP", otpSchema);
