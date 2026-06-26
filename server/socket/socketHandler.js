const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * In-memory room registry.
 * Maps roomId → Map<socketId, { userId, username, joinedAt }>
 */
const rooms = new Map();

// ─── Payload Validation Helpers ──────────────────────────
const isValidString = (val, maxLen = 200) =>
  typeof val === "string" && val.length > 0 && val.length <= maxLen;

const isValidRoomId = (val) =>
  isValidString(val, 50) && /^[a-zA-Z0-9_-]+$/.test(val.trim());

const isValidSocketId = (val) =>
  isValidString(val, 40);

/**
 * Initialise Socket.io event handlers on the given server instance.
 * Every socket connection is authenticated via JWT before being allowed
 * to join rooms or relay signaling data.
 */
module.exports = function initSocketHandler(io) {
  // ─── Connection-level JWT authentication middleware ────
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(" ")[1];

      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Verify the user still exists in the database
      const user = await User.findById(decoded.id).select("-password");

      if (!user) {
        return next(new Error("Authentication error: User not found"));
      }

      // Attach user info to the socket for downstream handlers
      socket.user = {
        id: user._id.toString(),
        username: user.username,
      };

      next();
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return next(new Error("Authentication error: Token expired"));
      }
      return next(new Error("Authentication error: Invalid token"));
    }
  });

  // ─── Connection handler ───────────────────────────────
  io.on("connection", (socket) => {
    console.log(
      `🔌  Socket connected: ${socket.id} (user: ${socket.user.username})`
    );

    // ── JOIN ROOM ─────────────────────────────────────────
    socket.on("join-room", ({ roomId }, callback) => {
      try {
        if (!roomId || typeof roomId !== "string") {
          return callback?.({ error: "Invalid room ID" });
        }

        const sanitizedRoomId = roomId.trim().substring(0, 50);

        if (!isValidRoomId(sanitizedRoomId)) {
          return callback?.({ error: "Room ID may only contain letters, numbers, hyphens, and underscores" });
        }

        // Initialise the room map if it doesn't exist
        if (!rooms.has(sanitizedRoomId)) {
          rooms.set(sanitizedRoomId, new Map());
        }

        const room = rooms.get(sanitizedRoomId);

        // Enforce maximum room size (mesh topology caps at ~4 peers)
        if (room.size >= 4) {
          return callback?.({ error: "Room is full (max 4 participants)" });
        }

        // Prevent the same user from joining twice
        for (const [, peer] of room) {
          if (peer.userId === socket.user.id) {
            return callback?.({ error: "You are already in this room" });
          }
        }

        // Register this socket in the room
        room.set(socket.id, {
          userId: socket.user.id,
          username: socket.user.username,
          joinedAt: new Date(),
        });

        socket.join(sanitizedRoomId);
        socket.currentRoom = sanitizedRoomId;

        // Build the list of existing participants for the newcomer
        const existingPeers = [];
        for (const [peerId, peerInfo] of room) {
          if (peerId !== socket.id) {
            existingPeers.push({
              socketId: peerId,
              userId: peerInfo.userId,
              username: peerInfo.username,
            });
          }
        }

        // Notify existing peers that a new user joined
        socket.to(sanitizedRoomId).emit("user-joined", {
          socketId: socket.id,
          userId: socket.user.id,
          username: socket.user.username,
        });

        // Acknowledge the join and send the peer list back to the caller
        callback?.({
          success: true,
          roomId: sanitizedRoomId,
          peers: existingPeers,
          participantCount: room.size,
        });

        console.log(
          `📥  ${socket.user.username} joined room "${sanitizedRoomId}" (${room.size} users)`
        );
      } catch (error) {
        console.error("Join room error:", error);
        callback?.({ error: "Failed to join room" });
      }
    });

    // ── LEAVE ROOM ────────────────────────────────────────
    socket.on("leave-room", (callback) => {
      handleLeaveRoom(socket, io);
      callback?.({ success: true });
    });

    // ── ROOM PARTICIPANTS QUERY ───────────────────────────
    socket.on("get-room-participants", (callback) => {
      const roomId = socket.currentRoom;
      if (!roomId) {
        return callback?.({ error: "Not in a room" });
      }

      const room = rooms.get(roomId);
      if (!room) {
        return callback?.({ error: "Room not found" });
      }

      const participants = [];
      for (const [peerId, peerInfo] of room) {
        participants.push({
          socketId: peerId,
          userId: peerInfo.userId,
          username: peerInfo.username,
          isYou: peerId === socket.id,
        });
      }

      callback?.({ success: true, participants, roomId });
    });

    // ── WEBRTC SIGNALING: SDP Offer ───────────────────────
    socket.on("video-offer", ({ targetSocketId, sdp }) => {
      if (!isValidSocketId(targetSocketId) || !sdp) return;

      // Verify target is in the same room
      const roomId = socket.currentRoom;
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (!room || !room.has(targetSocketId)) return;

      io.to(targetSocketId).emit("video-offer", {
        senderSocketId: socket.id,
        sdp,
        username: socket.user.username,
      });
    });

    // ── WEBRTC SIGNALING: SDP Answer ──────────────────────
    socket.on("video-answer", ({ targetSocketId, sdp }) => {
      if (!isValidSocketId(targetSocketId) || !sdp) return;

      // Verify target is in the same room
      const roomId = socket.currentRoom;
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (!room || !room.has(targetSocketId)) return;

      io.to(targetSocketId).emit("video-answer", {
        senderSocketId: socket.id,
        sdp,
      });
    });

    // ── WEBRTC SIGNALING: ICE Candidate ───────────────────
    socket.on("new-ice-candidate", ({ targetSocketId, candidate }) => {
      if (!isValidSocketId(targetSocketId) || !candidate) return;

      // Verify target is in the same room
      const roomId = socket.currentRoom;
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (!room || !room.has(targetSocketId)) return;

      io.to(targetSocketId).emit("new-ice-candidate", {
        senderSocketId: socket.id,
        candidate,
      });
    });

    // ── SCREEN SHARE STATUS ──────────────────────────────
    // Broadcast to room when a user starts/stops screen sharing
    socket.on("screen-share-status", ({ isSharing }) => {
      const roomId = socket.currentRoom;
      if (!roomId) return;

      socket.to(roomId).emit("screen-share-status", {
        socketId: socket.id,
        username: socket.user.username,
        isSharing: !!isSharing,
      });
    });

    // ── DISCONNECT ────────────────────────────────────────
    socket.on("disconnect", (reason) => {
      console.log(
        `🔌  Socket disconnected: ${socket.id} (${socket.user.username}) — ${reason}`
      );
      handleLeaveRoom(socket, io);
    });
  });
};

// ─── Helper: remove a socket from its current room ──────
function handleLeaveRoom(socket, io) {
  const roomId = socket.currentRoom;
  if (!roomId) return;

  const room = rooms.get(roomId);
  if (room) {
    room.delete(socket.id);

    // Notify remaining peers
    socket.to(roomId).emit("user-left", {
      socketId: socket.id,
      userId: socket.user.id,
      username: socket.user.username,
    });

    // Garbage-collect empty rooms
    if (room.size === 0) {
      rooms.delete(roomId);
      console.log(`🗑️  Room "${roomId}" removed (empty)`);
    }
  }

  socket.leave(roomId);
  socket.currentRoom = null;

  console.log(`📤  ${socket.user.username} left room "${roomId}"`);
}

// Export rooms for potential admin/monitoring use
module.exports.rooms = rooms;
