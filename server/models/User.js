const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const validator = require("validator");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [30, "Username must be at most 30 characters"],
      match: [
        /^[a-zA-Z0-9_]+$/,
        "Username may only contain letters, numbers, and underscores",
      ],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: (v) => validator.isEmail(v),
        message: "Please provide a valid email address",
      },
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // Never returned in queries by default
    },
    // ─── Social Profile Fields ─────────────────────────────
    displayName: {
      type: String,
      trim: true,
      maxlength: [50, "Display name must be at most 50 characters"],
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [150, "Bio must be at most 150 characters"],
      default: "",
    },
    avatar: {
      type: String,
      default: "", // Cloudinary URL stored here
    },
    // ─── Social Graph ──────────────────────────────────────
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    // ─── Account Status ────────────────────────────────────
    isVerified: {
      type: Boolean,
      default: false,
    },
    // ─── Preferences ───────────────────────────────────────
    theme: {
      type: String,
      enum: ["dark", "light"],
      default: "dark",
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// ─── Pre-save hook: hash password before storing ───────────
// Only runs when the password field has been modified (not on other updates)
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ─── Instance method: compare candidate password ──────────
// Used during login to verify the submitted password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ─── Strip sensitive fields from JSON output ──────────────
// Removes password and __v from any JSON serialization
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
