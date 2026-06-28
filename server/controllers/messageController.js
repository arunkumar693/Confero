const Message = require("../models/Message");
const User    = require("../models/User");
const mongoose = require("mongoose");

/**
 * @route   GET /api/messages/conversations
 * @desc    Get a list of all conversation partners for the current user,
 *          each with the last message and unread count.
 * @access  Private
 *
 * Uses an aggregation pipeline for efficiency — a single round-trip
 * instead of N+1 queries for each conversation partner.
 */
exports.getConversations = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const conversations = await Message.aggregate([
      // ── Stage 1: Match all messages involving the current user ──
      {
        $match: {
          $or: [{ sender: userId }, { recipient: userId }],
        },
      },
      // ── Stage 2: Sort newest first so $first picks the latest message ──
      { $sort: { createdAt: -1 } },
      // ── Stage 3: Group by the OTHER participant ───────────────────
      {
        $group: {
          _id: {
            // If I sent it → group by recipient; else → group by sender
            $cond: [{ $eq: ["$sender", userId] }, "$recipient", "$sender"],
          },
          lastMessage: { $first: "$$ROOT" },
          // Count messages sent TO me that are unread
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$recipient", userId] }, { $eq: ["$read", false] }] },
                1,
                0,
              ],
            },
          },
        },
      },
      // ── Stage 4: Join the partner's user document ─────────────────
      {
        $lookup: {
          from:         "users",
          localField:   "_id",
          foreignField: "_id",
          as:           "user",
        },
      },
      { $unwind: "$user" },
      // ── Stage 5: Project only the fields the client needs ─────────
      {
        $project: {
          user:        { _id: 1, username: 1, avatar: 1, displayName: 1 },
          lastMessage: 1,
          unreadCount: 1,
        },
      },
      // ── Stage 6: Sort conversations by most recent activity ───────
      { $sort: { "lastMessage.createdAt": -1 } },
    ]);

    res.status(200).json({ success: true, conversations });
  } catch (err) {
    console.error("getConversations error:", err);
    res.status(500).json({ success: false, message: "Failed to get conversations" });
  }
};

/**
 * @route   GET /api/messages/:userId
 * @desc    Get paginated message history between the current user and :userId
 * @access  Private
 * @query   page (default 1) — 30 messages per page, returned oldest-first
 */
exports.getMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const myId  = req.user.id;
    const page  = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 30;
    const skip  = (page - 1) * limit;

    // Fetch this page of messages (newest first so we can paginate backwards,
    // then reverse for chronological display)
    const messages = await Message.find({
      $or: [
        { sender: myId,    recipient: userId },
        { sender: userId,  recipient: myId  },
      ],
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("postRef", "imageUrl caption") // Expand any shared post reference
      .lean();

    // Mark incoming unread messages as read (best-effort, non-blocking)
    Message.updateMany(
      { sender: userId, recipient: myId, read: false },
      { read: true }
    ).catch((e) => console.error("Mark-read error:", e.message));

    // Reverse so the client receives messages in chronological order
    res.status(200).json({ success: true, messages: messages.reverse() });
  } catch (err) {
    console.error("getMessages error:", err);
    res.status(500).json({ success: false, message: "Failed to get messages" });
  }
};

/**
 * @route   POST /api/messages/:userId
 * @desc    Send a DM (REST fallback — Socket.io is preferred for real-time delivery)
 * @access  Private
 * @body    { text?: string, postRef?: ObjectId }
 */
exports.sendMessage = async (req, res) => {
  try {
    const { text, postRef } = req.body;
    const { userId }        = req.params;

    if (!text && !postRef) {
      return res.status(400).json({
        success: false,
        message: "Message text or post reference is required",
      });
    }

    // Verify the recipient exists before creating the document
    const recipient = await User.findById(userId).select("_id");
    if (!recipient) {
      return res.status(404).json({ success: false, message: "Recipient not found" });
    }

    const message = await Message.create({
      sender:    req.user.id,
      recipient: userId,
      text:      text ? text.trim() : "",
      postRef:   postRef || null,
    });

    await message.populate("postRef", "imageUrl caption");

    res.status(201).json({ success: true, message });
  } catch (err) {
    console.error("sendMessage error:", err);
    res.status(500).json({ success: false, message: "Failed to send message" });
  }
};
