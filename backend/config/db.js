const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : undefined,
});

// Same idempotent schema the `npm run migrate` script applies; running it on
// boot means a fresh database works without a separate step.
async function connectDB() {
  await pool.query("SELECT 1");
  const sql = fs.readFileSync(path.join(__dirname, "../db/schema.sql"), "utf8");
  await pool.query(sql);
  console.log("PostgreSQL connected");
}

// Run fn(client) inside a transaction; commits on success, rolls back on throw.
async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

connectDB.pool = pool;
connectDB.query = (text, params) => pool.query(text, params);
connectDB.tx = tx;
module.exports = connectDB;
