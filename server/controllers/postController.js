const Post = require("../models/Post");
const User = require("../models/User");
const path = require("path");
const fs = require("fs");

/**
 * @route   GET /api/posts/feed
 * @desc    Get paginated global feed (all posts, newest first)
 * @access  Private
 * @query   page (default 1), limit (default 12)
 */
exports.getFeed = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 12); // Cap at 50 per page
    const skip  = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      Post.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("author", "username avatar displayName")
        .populate("comments.author", "username avatar")
        .lean({ virtuals: true }), // Include likeCount / commentCount virtuals
      Post.countDocuments(),
    ]);

    res.status(200).json({
      success:    true,
      posts,
      page,
      totalPages: Math.ceil(total / limit),
      hasMore:    skip + posts.length < total,
    });
  } catch (err) {
    console.error("getFeed error:", err);
    res.status(500).json({ success: false, message: "Failed to load feed" });
  }
};

/**
 * @route   POST /api/posts
 * @desc    Create a new post (image required)
 * @access  Private
 * @body    multipart/form-data — field "image" + optional "caption"
 *
 * After multer + CloudinaryStorage, req.file contains:
 *   path     → Cloudinary delivery URL
 *   filename → Cloudinary public_id (used for deletion)
 */
exports.createPost = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "An image is required" });
    }

    const { caption } = req.body;

    const post = await Post.create({
      author:        req.user.id,
      imageUrl:      `/uploads/posts/${req.file.filename}`,
      imagePublicId: req.file.filename,
      caption:       caption ? caption.trim() : "",
    });

    // Populate author so the client gets username/avatar immediately
    await post.populate("author", "username avatar displayName");

    res.status(201).json({ success: true, post });
  } catch (err) {
    console.error("createPost error:", err);
    res.status(500).json({ success: false, message: "Failed to create post" });
  }
};

/**
 * @route   DELETE /api/posts/:id
 * @desc    Delete a post and its Cloudinary image (author only)
 * @access  Private
 */
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    // Authorisation: only the original author may delete
    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized to delete this post" });
    }

    // Delete local image file
    if (post.imagePublicId) {
      try {
        const filePath = path.join(__dirname, "../uploads/posts", post.imagePublicId);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (e) {
        console.error("Local file delete failed:", e);
      }
    }

    await Post.deleteOne({ _id: post._id });

    res.status(200).json({ success: true, message: "Post deleted" });
  } catch (err) {
    console.error("deletePost error:", err);
    res.status(500).json({ success: false, message: "Failed to delete post" });
  }
};

/**
 * @route   POST /api/posts/:id/like
 * @desc    Toggle like on a post (like if not liked, unlike if already liked)
 * @access  Private
 */
exports.toggleLike = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const userId       = req.user.id;
    const alreadyLiked = post.likes.some((id) => id.toString() === userId);

    if (alreadyLiked) {
      // Remove the like (unlike)
      post.likes = post.likes.filter((id) => id.toString() !== userId);
    } else {
      // Add the like
      post.likes.push(userId);
    }

    await post.save();

    res.status(200).json({
      success:   true,
      liked:     !alreadyLiked,
      likeCount: post.likes.length,
    });
  } catch (err) {
    console.error("toggleLike error:", err);
    res.status(500).json({ success: false, message: "Failed to toggle like" });
  }
};

/**
 * @route   POST /api/posts/:id/comment
 * @desc    Add a comment to a post
 * @access  Private
 * @body    { body: string }
 */
exports.addComment = async (req, res) => {
  try {
    const { body } = req.body;

    if (!body || !body.trim()) {
      return res.status(400).json({ success: false, message: "Comment body is required" });
    }

    if (body.trim().length > 500) {
      return res.status(400).json({ success: false, message: "Comment must be at most 500 characters" });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    // Push the new comment sub-document
    post.comments.push({ author: req.user.id, body: body.trim() });
    await post.save();

    // Populate the author of the newly added comment for the response
    await post.populate("comments.author", "username avatar");
    const newComment = post.comments[post.comments.length - 1];

    res.status(201).json({ success: true, comment: newComment });
  } catch (err) {
    console.error("addComment error:", err);
    res.status(500).json({ success: false, message: "Failed to add comment" });
  }
};

/**
 * @route   POST /api/posts/:id/react
 * @desc    Toggle an emoji reaction on a post
 * @access  Private
 * @body    { emoji: string }
 *
 * Uses a Mongoose Map so any emoji string can be a key.
 * If the user already reacted with this emoji → removes it.
 * If not → adds it. Empty arrays are pruned to keep the doc clean.
 */
exports.toggleReaction = async (req, res) => {
  try {
    const { emoji } = req.body;

    if (!emoji || typeof emoji !== "string") {
      return res.status(400).json({ success: false, message: "A valid emoji is required" });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const userId        = req.user.id;
    const emojiUsers    = post.reactions.get(emoji) || [];
    const alreadyReacted = emojiUsers.some((id) => id.toString() === userId);

    if (alreadyReacted) {
      // Remove this user's reaction
      post.reactions.set(emoji, emojiUsers.filter((id) => id.toString() !== userId));
    } else {
      // Add this user's reaction
      post.reactions.set(emoji, [...emojiUsers, userId]);
    }

    // Prune empty arrays to keep the reactions map tidy
    if ((post.reactions.get(emoji) || []).length === 0) {
      post.reactions.delete(emoji);
    }

    await post.save();

    // Convert Map to a plain object for JSON serialisation
    res.status(200).json({
      success:   true,
      reactions: Object.fromEntries(post.reactions),
    });
  } catch (err) {
    console.error("toggleReaction error:", err);
    res.status(500).json({ success: false, message: "Failed to toggle reaction" });
  }
};

/**
 * @route   GET /api/posts/user/:username
 * @desc    Get all posts by a specific user (for profile page)
 * @access  Private
 */
exports.getUserPosts = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const posts = await Post.find({ author: user._id })
      .sort({ createdAt: -1 })
      .populate("author", "username avatar displayName")
      .lean({ virtuals: true });

    res.status(200).json({ success: true, posts });
  } catch (err) {
    console.error("getUserPosts error:", err);
    res.status(500).json({ success: false, message: "Failed to get user posts" });
  }
};
