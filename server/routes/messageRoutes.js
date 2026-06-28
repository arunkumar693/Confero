const express  = require("express");
const router   = express.Router();
const { protect } = require("../middleware/auth");
const {
  getConversations,
  getMessages,
  sendMessage,
} = require("../controllers/messageController");

// ─── Message Routes ───────────────────────────────────────
// All routes require authentication via the `protect` middleware.
// Socket.io is the primary delivery mechanism; these REST endpoints
// serve as HTTP fallbacks and for initial page load hydration.

// GET  /api/messages/conversations    — list all conversation partners
// IMPORTANT: must be before /:userId to avoid "conversations" being
// treated as a userId parameter
router.get("/conversations", protect, getConversations);

// GET  /api/messages/:userId          — paginated message history with one user
router.get("/:userId", protect, getMessages);

// POST /api/messages/:userId          — send a message to one user (HTTP fallback)
router.post("/:userId", protect, sendMessage);

module.exports = router;
