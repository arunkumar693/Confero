const jwt     = require("jsonwebtoken");
const Message = require("../models/Message");

// ─── Online Users Registry ────────────────────────────────
// Maps userId (string) → Set<socketId>.
// A single user can be connected from multiple tabs/devices,
// so we use a Set of socket IDs rather than a single socket ID.
const onlineUsers = new Map();

/**
 * initSocketHandler — attaches authentication middleware and all
 * event handlers to the given Socket.io server instance.
 *
 * @param {import("socket.io").Server} io
 */
module.exports = (io) => {
  // ─── Socket Authentication Middleware ─────────────────
  // Runs before any connection is established.
  // The client must pass: { auth: { token: "<JWT>" } }
  io.use((socket, next) => {
    const token = socket.handshake.auth && socket.handshake.auth.token;

    if (!token) {
      return next(new Error("Authentication required — no token provided"));
    }

    try {
      const decoded     = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId     = decoded.id;
      socket.username   = decoded.username;
      next();
    } catch {
      next(new Error("Authentication failed — invalid or expired token"));
    }
  });

  // ─── Connection Handler ────────────────────────────────
  io.on("connection", (socket) => {
    const { userId, username } = socket;
    console.log(`🔌 Socket connected: ${username} (socket: ${socket.id})`);

    // ── Register this socket in the online-users map ─────
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Broadcast to ALL clients that this user is now online
    // (only fires once when their first tab connects)
    if (onlineUsers.get(userId).size === 1) {
      io.emit("user:online", { userId, username });
    }

    // Send the full list of currently online user IDs to the new socket
    socket.emit("users:online", Array.from(onlineUsers.keys()));

    // ────────────────────────────────────────────────────
    // ── Event: dm:send ───────────────────────────────────
    // Payload: { recipientId, text?, postRef? }
    // Saves the message to MongoDB, then pushes it to all
    // of the recipient's active sockets.
    // ────────────────────────────────────────────────────
    socket.on("dm:send", async (data) => {
      try {
        const { recipientId, text, postRef } = data || {};

        // Basic validation — at least one content field is required
        if (!recipientId || (!text && !postRef)) {
          return socket.emit("dm:error", { message: "recipientId and text or postRef are required" });
        }

        // Persist to the database (REST getMessages will also find this)
        const message = await Message.create({
          sender:    userId,
          recipient: recipientId,
          text:      text ? String(text).trim().slice(0, 1000) : "",
          postRef:   postRef || null,
        });

        await message.populate("postRef", "imageUrl caption");

        const payload = {
          ...message.toObject(),
          senderUsername: username,
        };

        // ── Deliver to the recipient's sockets ────────────
        const recipientSockets = onlineUsers.get(recipientId);
        if (recipientSockets && recipientSockets.size > 0) {
          recipientSockets.forEach((socketId) => {
            io.to(socketId).emit("dm:received", payload);
          });
        }

        // Confirm to the sender that the message was saved + delivered
        socket.emit("dm:sent", payload);
      } catch (err) {
        console.error("dm:send error:", err);
        socket.emit("dm:error", { message: "Failed to send message" });
      }
    });

    // ────────────────────────────────────────────────────
    // ── Event: dm:typing ─────────────────────────────────
    // Payload: { recipientId, isTyping: boolean }
    // Forwards the typing indicator to the recipient without storing it.
    // ────────────────────────────────────────────────────
    socket.on("dm:typing", ({ recipientId, isTyping }) => {
      const recipientSockets = onlineUsers.get(recipientId);
      if (recipientSockets) {
        recipientSockets.forEach((socketId) => {
          io.to(socketId).emit("dm:typing", {
            senderId:  userId,
            isTyping:  Boolean(isTyping),
          });
        });
      }
    });

    // ────────────────────────────────────────────────────
    // ── Event: disconnect ─────────────────────────────────
    // Remove this socket from the registry.
    // Only broadcast "offline" when the user's LAST socket disconnects
    // (i.e., they closed all tabs).
    // ────────────────────────────────────────────────────
    socket.on("disconnect", (reason) => {
      console.log(`🔴 Socket disconnected: ${username} (${socket.id}) — reason: ${reason}`);

      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);

        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          // Only broadcast "offline" when all tabs are closed
          io.emit("user:offline", { userId });
        }
      }
    });
  });
};
