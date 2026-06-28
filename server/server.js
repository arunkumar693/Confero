require("dotenv").config();

const express      = require("express");
const http         = require("http");
const path         = require("path");
const cors         = require("cors");
const helmet       = require("helmet");
const rateLimit    = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const hpp          = require("hpp");
const { Server }   = require("socket.io");
const { connectDB, closeDB } = require("./config/db");

// ─── Route Modules ────────────────────────────────────────
const authRoutes    = require("./routes/authRoutes");
const otpRoutes     = require("./routes/otpRoutes");
const postRoutes    = require("./routes/postRoutes");
const userRoutes    = require("./routes/userRoutes");
const messageRoutes = require("./routes/messageRoutes");

// ─── Socket Handler ───────────────────────────────────────
const initSocketHandler = require("./socket/socketHandler");

// ─── Express App ─────────────────────────────────────────
const app    = express();
const server = http.createServer(app);

// ─── Security Headers (Helmet) ────────────────────────────
// Sets X-Content-Type-Options, X-Frame-Options, HSTS, etc.
// CSP is only enabled in production — dev needs Vite WS connections.
// crossOriginResourcePolicy is relaxed to allow Cloudinary images to load.
app.use(
  helmet({
    contentSecurityPolicy:      process.env.NODE_ENV === "production",
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// ─── CORS ────────────────────────────────────────────────
// Allow requests only from the configured frontend origin.
// PATCH is included for potential partial-update endpoints.
app.use(
  cors({
    origin:  process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  })
);

// ─── Body Parsers ─────────────────────────────────────────
// Increase JSON limit to 10 MB to accommodate base64 previews if needed.
// Multer handles the actual multipart/form-data binary uploads separately.
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ─── NoSQL Injection Prevention ───────────────────────────
// Strips $ and . from req.body, req.query, and req.params,
// preventing operators like { $gt: "" } from reaching Mongoose.
app.use(mongoSanitize());

// ─── HTTP Parameter Pollution Prevention ──────────────────
// Prevents duplicate query-string keys being used to bypass validation
// (e.g. ?sort=asc&sort=desc$gte=1).
app.use(hpp());

// ─── General Rate Limiter ─────────────────────────────────
// 100 requests per 15 minutes per IP for all /api/* routes.
// Auth and OTP routes have their own stricter limiters applied at the
// router level, so this acts as a catch-all safety net.
const generalLimiter = rateLimit({
  windowMs:       15 * 60 * 1000,
  max:            100,
  message: {
    success: false,
    message: "Too many requests — please try again later",
  },
  standardHeaders: true,
  legacyHeaders:   false,
});

app.use("/api/", generalLimiter);

// ─── API Routes ───────────────────────────────────────────
app.use("/api/auth",     authRoutes);
app.use("/api/otp",      otpRoutes);
app.use("/api/posts",    postRoutes);
app.use("/api/users",    userRoutes);
app.use("/api/messages", messageRoutes);

// ─── Health Check ─────────────────────────────────────────
// Used by deployment platforms and monitoring tools to verify
// the server is running and connected to the database.
app.get("/api/health", (_req, res) => {
  res.json({
    status:      "ok",
    uptime:      process.uptime(),
    timestamp:   new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// ─── Static Files ─────────────────────────────────────────
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ─── 404 Catch-all ────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ─── Global Error Handler ─────────────────────────────────
// Catches any error passed to next(err) from controllers/middleware.
// Stack traces are hidden in production to prevent information leakage.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);

  // Handle multer file-size / file-type errors
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ success: false, message: "File too large" });
  }
  if (err.message && err.message.includes("Only image files are allowed")) {
    return res.status(415).json({ success: false, message: err.message });
  }

  const message =
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message || "Internal server error";

  res.status(err.status || 500).json({ success: false, message });
});

// ─── Socket.io Server ─────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin:      process.env.CLIENT_URL || "http://localhost:5173",
    methods:     ["GET", "POST"],
    credentials: true,
  },
  pingTimeout:       60000, // Wait 60s for a pong before disconnecting
  pingInterval:      25000, // Send a ping every 25s
  maxHttpBufferSize: 1e6,   // 1 MB max event payload — prevents abuse
});

// Register all Socket.io event handlers
initSocketHandler(io);

// ─── Start Server ─────────────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║   🚀  SocialMini Server running on port ${String(PORT).padEnd(15)}    ║
║   📡  Socket.io ready for real-time connections          ║
║   🔒  Security: Helmet + CORS + Rate-Limit + HPP         ║
║   ☁️   Cloudinary image storage configured               ║
║   📧  Nodemailer OTP emails enabled                      ║
║   🌐  CORS origin: ${(process.env.CLIENT_URL || "http://localhost:5173").padEnd(34)} ║
║   🛡️   NoSQL injection & HPP protection enabled          ║
╚══════════════════════════════════════════════════════════╝
    `);
  });
});

// ─── Graceful Shutdown ────────────────────────────────────
// Handles SIGINT (Ctrl+C) and SIGTERM (kill / deployment shutdown).
// Allows in-flight requests to complete before closing connections.
const shutdown = async (signal) => {
  console.log(`\n${signal} received — shutting down gracefully…`);

  // 1. Stop accepting new socket connections
  io.close(() => {
    console.log("🔌 Socket.io connections closed");
  });

  // 2. Close MongoDB connection
  try {
    await closeDB();
    console.log("🗄️  MongoDB connection closed");
  } catch (err) {
    console.error("Error closing MongoDB:", err.message);
  }

  // 3. Close the HTTP server
  server.close(() => {
    console.log("🚪 HTTP server closed");
    process.exit(0);
  });

  // Force-exit after 10 seconds if graceful shutdown stalls
  setTimeout(() => {
    console.error("⚠️  Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
};

process.on("SIGINT",  () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
