const crypto = require("crypto");

// Encrypts/decrypts StorageAccount refresh tokens at rest.
// DRIVE_TOKEN_ENCRYPTION_KEY must be a 32-byte secret (see .env.example).
const ALGO = "aes-256-gcm";

function keyBuffer() {
  return crypto.createHash("sha256").update(String(process.env.DRIVE_TOKEN_ENCRYPTION_KEY)).digest();
}

function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, keyBuffer(), iv);
  const enc = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

function decrypt(payload) {
  const buf = Buffer.from(payload, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = crypto.createDecipheriv(ALGO, keyBuffer(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

module.exports = { encrypt, decrypt };
