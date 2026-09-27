const jwt = require("jsonwebtoken");

function signAccessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role, is_staff: user.role === "admin" },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || "15m" }
  );
}

function signRefreshToken(user) {
  return jwt.sign({ sub: user._id.toString() }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES || "7d",
  });
}

// Short-lived video-access token: proves "this student, this lesson" for a few
// minutes. Re-verified on every key request and every segment redirect —
// nothing about video access is ever a permanent URL. Replaces Django's
// TimestampSigner from the original spec.
function signVideoToken(studentId, lessonId) {
  return jwt.sign({ sub: studentId, lessonId }, process.env.VIDEO_TOKEN_SECRET, {
    expiresIn: process.env.VIDEO_TOKEN_EXPIRES || "5m",
  });
}

function verifyVideoToken(token) {
  return jwt.verify(token, process.env.VIDEO_TOKEN_SECRET);
}

module.exports = { signAccessToken, signRefreshToken, signVideoToken, verifyVideoToken };
