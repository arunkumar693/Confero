require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const hpp = require("hpp");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const { connectDB, closeDB } = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const initSocketHandler = require("./socket/socketHandler");

// ─── Express App ─────────────────────────────────────────
const app = express();
const server = http.createServer(app);

// ─── Security Middleware ─────────────────────────────────

// Helmet: Sets various HTTP security headers (X-Content-Type-Options,
// X-Frame-Options, Strict-Transport-Security, etc.)
app.use(
  helmet({
    // Relax CSP in dev so the Vite client can connect via WebSocket
    contentSecurityPolicy: process.env.NODE_ENV === "production",
  })
);

// CORS: Only allow the configured frontend origin
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// Body Parsers
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

// NoSQL Injection Prevention: Strips $ and . from req.body, req.query, req.params
app.use(mongoSanitize());

// HTTP Parameter Pollution Protection
app.use(hpp());

// ─── Rate Limiting ───────────────────────────────────────

// General API limiter: 100 requests per 15 min per IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: "Too many requests — please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/", generalLimiter);

// ─── API Routes ──────────────────────────────────────────
app.use("/api/auth", authRoutes);

// ─── Health Check ────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// ─── 404 Catch-all ───────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ─── Global Error Handler ────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);

  // Don't leak stack traces in production
  const message =
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message || "Internal server error";

  res.status(err.status || 500).json({ success: false, message });
});

// ─── Socket.io Server ───────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  // Limit payload size to prevent abuse
  maxHttpBufferSize: 1e6, // 1 MB
});

// Initialise signaling and room-management logic
initSocketHandler(io);

// ─── Start Server ────────────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════╗
║   🚀  Confero Server running on port ${String(PORT).padEnd(15)}  ║
║   📡  Socket.io ready for connections                ║
║   🔒  Security: Helmet + CORS + Rate-Limit + HPP    ║
║   🌐  CORS origin: ${(process.env.CLIENT_URL || "http://localhost:5173").padEnd(32)} ║
║   🛡️   NoSQL injection protection enabled            ║
╚══════════════════════════════════════════════════════╝
    `);
  });
});

// ─── Graceful Shutdown ───────────────────────────────────
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

  // 3. Close HTTP server
  server.close(() => {
    console.log("🚪 HTTP server closed");
    process.exit(0);
  });

  // Force exit after 10s if graceful shutdown stalls
  setTimeout(() => {
    console.error("⚠️  Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
