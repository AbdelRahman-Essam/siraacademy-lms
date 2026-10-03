const { query: q } = require("../config/db");

const map = (r) =>
  r && {
    _id: r.id,
    id: r.id,
    label: r.label,
    ownerEmail: r.owner_email,
    refreshTokenEnc: r.refresh_token_enc,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };

async function create({ label, ownerEmail, refreshTokenEnc }) {
  const { rows } = await q(
    `INSERT INTO storage_accounts (label, owner_email, refresh_token_enc)
     VALUES ($1, $2, $3) RETURNING *`,
    [label, ownerEmail, refreshTokenEnc]
  );
  return map(rows[0]);
}

async function findById(id) {
  if (!id) return null;
  const { rows } = await q("SELECT * FROM storage_accounts WHERE id = $1", [id]);
  return map(rows[0]);
}

// Never returns the encrypted refresh token.
async function list() {
  const { rows } = await q(
    "SELECT id, label, owner_email, created_at FROM storage_accounts ORDER BY created_at, id"
  );
  return rows.map((r) => ({ _id: r.id, label: r.label, ownerEmail: r.owner_email, createdAt: r.created_at }));
}

module.exports = { create, findById, list };
