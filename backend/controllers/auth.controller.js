const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { signAccessToken, signRefreshToken } = require("../utils/jwt");

async function register(req, res) {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ detail: "username, email and password are required." });
  }
  const exists = await User.findOne({ $or: [{ username }, { email }] });
  if (exists) return res.status(400).json({ detail: "Username or email already in use." });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ username, email, passwordHash, role: "student" });
  return res.status(201).json({
    access: signAccessToken(user),
    refresh: signRefreshToken(user),
    user: { id: user._id, username: user.username, role: user.role },
  });
}

async function login(req, res) {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(401).json({ detail: "Invalid credentials." });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ detail: "Invalid credentials." });

  return res.json({
    access: signAccessToken(user),
    refresh: signRefreshToken(user),
    user: { id: user._id, username: user.username, role: user.role },
  });
}

async function refresh(req, res) {
  const { refresh: refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ detail: "refresh token required." });
  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ detail: "Invalid refresh token." });
    return res.json({ access: signAccessToken(user) });
  } catch {
    return res.status(401).json({ detail: "Invalid or expired refresh token." });
  }
}

module.exports = { register, login, refresh };
