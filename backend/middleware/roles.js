// requireRole('admin') or requireRole('admin', 'teacher') — server-side only,
// same rule as the original DRF permission classes.
function requireRole(...allowed) {
  return (req, res, next) => {
    if (!req.user || !allowed.includes(req.user.role)) {
      return res.status(403).json({ detail: "You do not have permission to perform this action." });
    }
    next();
  };
}

module.exports = requireRole;
