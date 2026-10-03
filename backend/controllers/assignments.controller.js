const fs = require("fs");
const cloudinary = require("cloudinary").v2;
const Courses = require("../models/courses");
const Enrollments = require("../models/enrollments");
const Submissions = require("../models/submissions");

// Assignment detail — gated by the same lesson-unlock rule as video.
async function getAssignment(req, res) {
  const { courseId, lessonId } = req.params;
  const lesson = await Courses.getLesson(courseId, lessonId);
  if (!lesson?.assignment) return res.status(404).json({ detail: "No assignment for this lesson." });

  const enrollment = await Enrollments.findOne(req.user.id, courseId);
  if (!enrollment || lesson.order > enrollment.unlockedLessonOrder) {
    return res.status(403).json({ detail: "This lesson is not unlocked for you." });
  }
  res.json({ id: lesson.assignment._id, audioPromptUrl: lesson.assignment.audioPromptUrl, instructions: lesson.assignment.instructions });
}

// Final submission only — re-recording/preview happens entirely client-side
// before this is ever called. One submission per (student, assignment); a
// second call is rejected by the unique constraint, matching "locks on submit".
async function submit(req, res) {
  const { courseId, lessonId } = req.params;
  const { audioFileUrl } = req.body; // uploaded via multer in the route, url passed in
  const lesson = await Courses.getLesson(courseId, lessonId);
  if (!lesson?.assignment) return res.status(404).json({ detail: "No assignment for this lesson." });

  const enrollment = await Enrollments.findOne(req.user.id, courseId);
  if (!enrollment || lesson.order > enrollment.unlockedLessonOrder) {
    return res.status(403).json({ detail: "This lesson is not unlocked for you." });
  }

  try {
    const submission = await Submissions.create({
      studentId: req.user.id,
      courseId,
      lessonId,
      assignmentId: lesson.assignment._id,
      audioFileUrl,
    });
    res.status(201).json(submission);
  } catch (err) {
    if (err.code === "23505") return res.status(400).json({ detail: "You've already submitted this assignment." });
    throw err;
  }
}

// Student-facing audio upload — distinct from the admin media endpoint,
// which requires the admin role. Returns the URL the client then passes to
// `submit` as audioFileUrl.
async function uploadAudio(req, res) {
  if (!req.file) return res.status(400).json({ detail: "No audio file uploaded." });
  const result = await cloudinary.uploader.upload(req.file.path, { resource_type: "video" }); // audio goes through Cloudinary's "video" pipeline
  fs.unlink(req.file.path, () => {});
  res.json({ url: result.secure_url });
}

module.exports = { getAssignment, submit, uploadAudio };
