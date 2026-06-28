const mongoose = require("mongoose");

// ─── Message Schema ───────────────────────────────────────
// Represents a single direct message between two users.
// Messages are NOT embedded — they're top-level documents for
// efficient pagination and unread-count queries.
const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      trim: true,
      maxlength: [1000, "Message must be at most 1000 characters"],
    },
    // Optional: allow users to share a post inside a DM
    postRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      default: null,
    },
    // Track whether the recipient has read the message
    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // createdAt used for ordering the conversation
  }
);

// ─── Compound Index ───────────────────────────────────────
// Optimises the most common query: "all messages between user A and user B,
// ordered newest-first". Covers both sender→recipient and recipient→sender
// lookups when combined with the $or query in messageController.
messageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });

module.exports = mongoose.model("Message", messageSchema);
