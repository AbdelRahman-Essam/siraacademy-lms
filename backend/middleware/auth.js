const jwt = require("jsonwebtoken");

// Verifies the access JWT and attaches { id, role } to req.user.
// Mirrors DRF's simplejwt auth class — never trust a role sent from the client.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ detail: "Authentication required." });

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (err) {
    return res.status(401).json({ detail: "Invalid or expired token." });
  }
}

module.exports = requireAuth;
