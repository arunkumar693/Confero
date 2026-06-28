const express    = require("express");
const router     = express.Router();
const { protect }    = require("../middleware/auth");
const { uploadPost } = require("../middleware/upload");
const {
  getFeed,
  createPost,
  deletePost,
  toggleLike,
  addComment,
  toggleReaction,
  getUserPosts,
} = require("../controllers/postController");

// ─── Post Routes ──────────────────────────────────────────
// All routes require authentication via the `protect` middleware.

// GET  /api/posts/feed                 — paginated global feed
router.get("/feed", protect, getFeed);

// POST /api/posts                      — create a new post (multipart image upload)
// uploadPost multer middleware runs before the controller, placing
// the Cloudinary result on req.file
router.post("/", protect, uploadPost, createPost);

// GET  /api/posts/user/:username       — all posts by a specific user
// Must come BEFORE /:id to avoid "user" being treated as an id
router.get("/user/:username", protect, getUserPosts);

// DELETE /api/posts/:id               — delete own post
router.delete("/:id", protect, deletePost);

// POST /api/posts/:id/like            — toggle like
router.post("/:id/like", protect, toggleLike);

// POST /api/posts/:id/comment         — add a comment
router.post("/:id/comment", protect, addComment);

// POST /api/posts/:id/react           — toggle emoji reaction
router.post("/:id/react", protect, toggleReaction);

module.exports = router;
