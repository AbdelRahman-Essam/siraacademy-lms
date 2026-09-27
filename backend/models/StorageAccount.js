const mongoose = require("mongoose");

// One row per Google account used for course video storage. refreshTokenEnc
// is encrypted at rest via utils/crypto.js — never store it in plaintext.
const storageAccountSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    ownerEmail: { type: String, required: true },
    refreshTokenEnc: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("StorageAccount", storageAccountSchema);
