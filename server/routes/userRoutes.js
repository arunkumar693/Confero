const express      = require("express");
const router       = express.Router();
const { protect }      = require("../middleware/auth");
const { uploadAvatar } = require("../middleware/upload");
const {
  getProfile,
  updateProfile,
  updateTheme,
  toggleFollow,
  searchUsers,
} = require("../controllers/userController");

// ─── User Routes ──────────────────────────────────────────
// All routes require authentication via the `protect` middleware.

// GET  /api/users/search              — search users by username
// IMPORTANT: must be before /:username to avoid "search" being treated
// as a username parameter
router.get("/search", protect, searchUsers);

// GET  /api/users/me                  — convenience redirect to own profile
// req.user.username is set by the protect middleware from the JWT payload
router.get("/me", protect, (req, res) => {
  res.redirect(`/api/users/${req.user.username}`);
});

// PUT  /api/users/me                  — update bio, displayName, and/or avatar
// uploadAvatar multer middleware handles optional avatar file upload
router.put("/me", protect, uploadAvatar, updateProfile);

// PUT  /api/users/me/theme            — update theme preference
router.put("/me/theme", protect, updateTheme);

// GET  /api/users/:username           — get any user's public profile
router.get("/:username", protect, getProfile);

// POST /api/users/:id/follow          — toggle follow/unfollow
router.post("/:id/follow", protect, toggleFollow);

module.exports = router;
