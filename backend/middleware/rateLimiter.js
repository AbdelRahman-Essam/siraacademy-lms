const rateLimit = require("express-rate-limit");

// Mirrors the Django throttle: 10 requests/min on auth endpoints.
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { detail: "Too many attempts. Please wait a moment and try again." },
});

module.exports = { authLimiter };
