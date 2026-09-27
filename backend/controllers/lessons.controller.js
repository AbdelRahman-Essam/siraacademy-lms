const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const StorageAccount = require("../models/StorageAccount");
const { signVideoToken, verifyVideoToken } = require("../utils/jwt");
const { getSignedSegmentUrl } = require("../utils/drive");

async function findLesson(courseId, lessonId) {
  const course = await Course.findById(courseId);
  if (!course) return {};
  const lesson = course.lessons.id(lessonId);
  return { course, lesson };
}

async function assertUnlocked(studentId, course, lesson) {
  const enrollment = await Enrollment.findOne({ student: studentId, course: course._id });
  if (!enrollment) return false;
  return lesson.order <= enrollment.unlockedLessonOrder;
}

// Step 1: student requests access to a lesson's video. Re-checks enrollment +
// unlock state, then issues the 5-min video token used for every subsequent
// key/segment request. No video content is returned here.
async function getVideoToken(req, res) {
  const { courseId, lessonId } = req.params;
  const { course, lesson } = await findLesson(courseId, lessonId);
  if (!lesson) return res.status(404).json({ detail: "Lesson not found." });

  const ok = await assertUnlocked(req.user.id, course, lesson);
  if (!ok) return res.status(403).json({ detail: "This lesson is not unlocked for you." });

  res.json({ token: signVideoToken(req.user.id, lessonId), playlistUrl: `/api/lessons/${lessonId}/playlist.m3u8` });
}

// Step 2: serve a rewritten HLS playlist — every segment URI points back at
// THIS server (not at Drive), so every segment request re-validates the
// token before anything is handed out. See platform-specification-v2.md §4.
async function getPlaylist(req, res) {
  const { token } = req.query;
  let payload;
  try {
    payload = verifyVideoToken(token);
  } catch {
    return res.status(401).json({ detail: "Invalid or expired video token." });
  }
  if (payload.lessonId !== req.params.lessonId) {
    return res.status(403).json({ detail: "Token does not match this lesson." });
  }

  const course = await Course.findOne({ "lessons._id": req.params.lessonId });
  const lesson = course?.lessons.id(req.params.lessonId);
  if (!lesson) return res.status(404).json({ detail: "Lesson not found." });

  const lines = ["#EXTM3U", "#EXT-X-VERSION:3", "#EXT-X-TARGETDURATION:10"];
  lesson.segments
    .sort((a, b) => a.index - b.index)
    .forEach((seg) => {
      lines.push("#EXTINF:10.0,");
      lines.push(`/api/lessons/${lesson._id}/segments/${seg.index}?token=${token}`);
    });
  lines.push("#EXT-X-ENDLIST");

  res.set("Content-Type", "application/vnd.apple.mpegurl");
  res.send(lines.join("\n"));
}

// Step 3: one segment request -> re-validate token -> mint a fresh short-lived
// Drive access token -> 302 redirect. The actual bytes flow browser<->Google
// directly from here on; this server never re-touches them.
async function getSegment(req, res) {
  const { lessonId, index } = req.params;
  const { token } = req.query;
  let payload;
  try {
    payload = verifyVideoToken(token);
  } catch {
    return res.status(401).json({ detail: "Invalid or expired video token." });
  }
  if (payload.lessonId !== lessonId) return res.status(403).json({ detail: "Token mismatch." });

  const course = await Course.findOne({ "lessons._id": lessonId });
  const lesson = course?.lessons.id(lessonId);
  const segment = lesson?.segments.find((s) => String(s.index) === String(index));
  if (!segment) return res.status(404).json({ detail: "Segment not found." });

  const storageAccount = await StorageAccount.findById(course.storageAccount);
  const url = await getSignedSegmentUrl(storageAccount, segment.driveFileId);
  res.redirect(302, url);
}

// Decryption key — same re-verification as the segment/playlist flow.
async function getKey(req, res) {
  const { courseId, lessonId } = req.params;
  const { token } = req.query;
  try {
    const payload = verifyVideoToken(token);
    if (payload.lessonId !== lessonId) throw new Error("mismatch");
  } catch {
    return res.status(401).json({ detail: "Invalid or expired video token." });
  }

  const { lesson } = await findLesson(courseId, lessonId);
  if (!lesson) return res.status(404).json({ detail: "Lesson not found." });
  res.json({ keyId: lesson.encryptionKeyId, key: lesson.encryptionKey });
}

module.exports = { getVideoToken, getPlaylist, getSegment, getKey };
