const { query: q } = require("../config/db");

const map = (r) =>
  r && {
    _id: r.id,
    id: r.id,
    username: r.username,
    email: r.email,
    passwordHash: r.password_hash,
    role: r.role,
    deviceId: r.device_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };

const normUsername = (u) => String(u ?? "").trim();
const normEmail = (e) => String(e ?? "").trim().toLowerCase();

async function findByUsername(username) {
  const { rows } = await q("SELECT * FROM users WHERE username = $1", [normUsername(username)]);
  return map(rows[0]);
}

async function findById(id) {
  const { rows } = await q("SELECT * FROM users WHERE id = $1", [id]);
  return map(rows[0]);
}

async function findByUsernameOrEmail(username, email) {
  const { rows } = await q("SELECT * FROM users WHERE username = $1 OR email = $2 LIMIT 1", [
    normUsername(username),
    normEmail(email),
  ]);
  return map(rows[0]);
}

// Throws a pg error with code 23505 if username/email already exist.
async function create({ username, email, passwordHash, role = "student" }) {
  const { rows } = await q(
    `INSERT INTO users (username, email, password_hash, role)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [normUsername(username), normEmail(email), passwordHash, role]
  );
  return map(rows[0]);
}

async function count() {
  const { rows } = await q("SELECT count(*)::int AS n FROM users");
  return rows[0].n;
}

module.exports = { findByUsername, findById, findByUsernameOrEmail, create, count };
