const cloudinary = require("cloudinary").v2;

// ─── Cloudinary Configuration ─────────────────────────────
// Credentials are loaded from .env — never hardcoded.
// CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
// must all be set in the environment for uploads to work.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Export the configured v2 client for use in upload middleware and controllers
module.exports = cloudinary;
