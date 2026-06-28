const User = require("../models/User");
const path = require("path");
const fs = require("fs");

/**
 * @route   GET /api/users/:username
 * @desc    Get a user's public profile by username
 * @access  Private
 */
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select("-password")
      .populate("followers", "username avatar displayName")
      .populate("following", "username avatar displayName");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, user });
  } catch (err) {
    console.error("getProfile error:", err);
    res.status(500).json({ success: false, message: "Failed to get profile" });
  }
};

/**
 * @route   PUT /api/users/me
 * @desc    Update the authenticated user's bio, displayName, and/or avatar
 * @access  Private
 * @body    multipart/form-data — optional fields: "bio", "displayName", "avatar" (file)
 */
exports.updateProfile = async (req, res) => {
  try {
    const updates = {};

    // Only include fields that were explicitly sent
    if (req.body.bio !== undefined) {
      updates.bio = req.body.bio.trim().slice(0, 150);
    }
    if (req.body.displayName !== undefined) {
      updates.displayName = req.body.displayName.trim().slice(0, 50);
    }

    // ── Avatar upload handling ────────────────────────────
    if (req.file) {
      // Delete old avatar locally if it exists
      const currentUser = await User.findById(req.user.id);
      if (currentUser.avatar && currentUser.avatar.startsWith("/uploads/avatars/")) {
        try {
          const oldFilename = currentUser.avatar.split("/").pop();
          const filePath = path.join(__dirname, "../uploads/avatars", oldFilename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (e) {
          // Non-fatal
        }
      }
      updates.avatar = `/uploads/avatars/${req.file.filename}`;
    }

    const user = await User.findByIdAndUpdate(req.user.id, updates, {
      new:          true,   // Return the updated document
      runValidators: true,  // Apply schema validators
    }).select("-password");

    res.status(200).json({ success: true, user });
  } catch (err) {
    console.error("updateProfile error:", err);
    res.status(500).json({ success: false, message: "Failed to update profile" });
  }
};

/**
 * @route   PUT /api/users/me/theme
 * @desc    Update the authenticated user's UI theme preference
 * @access  Private
 * @body    { theme: "dark" | "light" }
 */
exports.updateTheme = async (req, res) => {
  try {
    const { theme } = req.body;

    if (!theme || !["dark", "light"].includes(theme)) {
      return res.status(400).json({
        success: false,
        message: "Theme must be 'dark' or 'light'",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { theme },
      { new: true }
    ).select("-password");

    res.status(200).json({ success: true, user });
  } catch (err) {
    console.error("updateTheme error:", err);
    res.status(500).json({ success: false, message: "Failed to update theme" });
  }
};

/**
 * @route   POST /api/users/:id/follow
 * @desc    Toggle follow / unfollow a user
 * @access  Private
 *
 * Uses $addToSet / $pull to ensure idempotency — calling follow twice
 * is the same as calling it once.
 */
exports.toggleFollow = async (req, res) => {
  try {
    // Prevent self-follow
    if (req.params.id === req.user.id) {
      return res.status(400).json({ success: false, message: "You cannot follow yourself" });
    }

    const targetUser  = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const currentUser  = await User.findById(req.user.id);
    const isFollowing  = currentUser.following.some(
      (id) => id.toString() === req.params.id
    );

    if (isFollowing) {
      // Unfollow: remove from both sides atomically
      await User.findByIdAndUpdate(req.user.id,    { $pull: { following: req.params.id } });
      await User.findByIdAndUpdate(req.params.id,  { $pull: { followers: req.user.id  } });
    } else {
      // Follow: $addToSet prevents duplicate entries
      await User.findByIdAndUpdate(req.user.id,    { $addToSet: { following: req.params.id } });
      await User.findByIdAndUpdate(req.params.id,  { $addToSet: { followers: req.user.id  } });
    }

    res.status(200).json({
      success:   true,
      following: !isFollowing,
      message:   isFollowing ? "Unfollowed" : "Followed",
    });
  } catch (err) {
    console.error("toggleFollow error:", err);
    res.status(500).json({ success: false, message: "Failed to toggle follow" });
  }
};

/**
 * @route   GET /api/users/search
 * @desc    Search users by username (case-insensitive partial match)
 * @access  Private
 * @query   q — search term (min 2 characters)
 */
exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;

    // Short-circuit for empty/too-short queries
    if (!q || q.trim().length < 2) {
      return res.status(200).json({ success: true, users: [] });
    }

    // Escape regex special characters to prevent ReDoS
    const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const users = await User.find({
      username: { $regex: escaped, $options: "i" },
      _id:      { $ne: req.user.id }, // Exclude the searching user
    })
      .select("username avatar displayName bio followers")
      .limit(20);

    res.status(200).json({ success: true, users });
  } catch (err) {
    console.error("searchUsers error:", err);
    res.status(500).json({ success: false, message: "Search failed" });
  }
};
