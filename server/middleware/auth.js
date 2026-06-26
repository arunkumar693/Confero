const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Express middleware: Verify JWT from the Authorization header.
 * Attaches the authenticated user document to `req.user`.
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // Accept "Bearer <token>" in the Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer")) {
      token = authHeader.split(" ")[1];
    }

    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "Not authorized — no token provided" });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user to the request (exclude password)
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "User belonging to this token no longer exists" });
    }

    req.user = user;
    next();
  } catch (err) {
    const message =
      err.name === "TokenExpiredError"
        ? "Token expired — please log in again"
        : "Not authorized — invalid token";

    return res.status(401).json({ success: false, message });
  }
};

module.exports = { protect };
