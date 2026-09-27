const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["student", "teacher", "admin"], default: "student" },
    deviceId: { type: String, default: null }, // optional single-device binding
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
