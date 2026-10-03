const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Users = require("../models/users");
const { signAccessToken, signRefreshToken } = require("../utils/jwt");

async function register(req, res) {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ detail: "username, email and password are required." });
  }
  const exists = await Users.findByUsernameOrEmail(username, email);
  if (exists) return res.status(400).json({ detail: "Username or email already in use." });

  const passwordHash = await bcrypt.hash(password, 10);
  let user;
  try {
    user = await Users.create({ username, email, passwordHash, role: "student" });
  } catch (err) {
    // Two simultaneous registrations can both pass the check above; the unique constraint settles it.
    if (err.code === "23505") return res.status(400).json({ detail: "Username or email already in use." });
    throw err;
  }
  return res.status(201).json({
    access: signAccessToken(user),
    refresh: signRefreshToken(user),
    user: { id: user._id, username: user.username, role: user.role },
  });
}

async function login(req, res) {
  const { username, password } = req.body;
  const user = await Users.findByUsername(username);
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
    const user = await Users.findById(payload.sub);
    if (!user) return res.status(401).json({ detail: "Invalid refresh token." });
    return res.json({ access: signAccessToken(user) });
  } catch {
    return res.status(401).json({ detail: "Invalid or expired refresh token." });
  }
}

module.exports = { register, login, refresh };
