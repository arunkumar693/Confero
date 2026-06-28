const mongoose = require("mongoose");

// ─── Embedded Comment Sub-Schema ─────────────────────────
// Comments are stored directly inside the post document (denormalized)
// for fast retrieval without extra DB queries on the feed.
const commentSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    body: {
      type: String,
      required: [true, "Comment body is required"],
      maxlength: [500, "Comment must be at most 500 characters"],
      trim: true,
    },
  },
  { timestamps: true } // Adds createdAt/updatedAt to each comment
);

// ─── Post Schema ─────────────────────────────────────────
const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Post must have an author"],
    },
    imageUrl: {
      type: String,
      required: [true, "Post must have an image"], // Cloudinary delivery URL
    },
    imagePublicId: {
      type: String, // Cloudinary public_id — needed to delete the image later
    },
    caption: {
      type: String,
      trim: true,
      maxlength: [2200, "Caption must be at most 2200 characters"],
      default: "",
    },
    // ─── Engagement ──────────────────────────────────────
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // References to users who liked this post
      },
    ],
    comments: [commentSchema], // Embedded sub-documents
    // Emoji reactions: { "❤️": [userId, userId, ...], "😂": [...] }
    // Map type allows arbitrary emoji keys
    reactions: {
      type: Map,
      of: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },   // Include virtual fields in JSON responses
    toObject: { virtuals: true }, // Include virtual fields in object conversions
  }
);

// ─── Virtual Fields ───────────────────────────────────────
// These are computed on-the-fly and not stored in the DB

// likeCount: total number of likes
postSchema.virtual("likeCount").get(function () {
  return this.likes.length;
});

// commentCount: total number of comments
postSchema.virtual("commentCount").get(function () {
  return this.comments.length;
});

// ─── Database Indexes ─────────────────────────────────────
// Compound index: fast user profile page queries (user's posts, newest first)
postSchema.index({ author: 1, createdAt: -1 });
// Single-field index: fast global feed queries (all posts, newest first)
postSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Post", postSchema);
