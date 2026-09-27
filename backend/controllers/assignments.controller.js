const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const StudentSubmission = require("../models/StudentSubmission");

// Assignment detail — gated by the same lesson-unlock rule as video.
async function getAssignment(req, res) {
  const { courseId, lessonId } = req.params;
  const course = await Course.findById(courseId);
  const lesson = course?.lessons.id(lessonId);
  if (!lesson?.assignment) return res.status(404).json({ detail: "No assignment for this lesson." });

  const enrollment = await Enrollment.findOne({ student: req.user.id, course: courseId });
  if (!enrollment || lesson.order > enrollment.unlockedLessonOrder) {
    return res.status(403).json({ detail: "This lesson is not unlocked for you." });
  }
  res.json({ id: lesson.assignment._id, audioPromptUrl: lesson.assignment.audioPromptUrl, instructions: lesson.assignment.instructions });
}

// Final submission only — re-recording/preview happens entirely client-side
// before this is ever called. One submission per (student, assignment); a
// second call is rejected by the unique index, matching "locks on submit".
async function submit(req, res) {
  const { courseId, lessonId } = req.params;
  const { audioFileUrl } = req.body; // uploaded via multer in the route, url passed in
  const course = await Course.findById(courseId);
  const lesson = course?.lessons.id(lessonId);
  if (!lesson?.assignment) return res.status(404).json({ detail: "No assignment for this lesson." });

  const enrollment = await Enrollment.findOne({ student: req.user.id, course: courseId });
  if (!enrollment || lesson.order > enrollment.unlockedLessonOrder) {
    return res.status(403).json({ detail: "This lesson is not unlocked for you." });
  }

  try {
    const submission = await StudentSubmission.create({
      student: req.user.id,
      course: courseId,
      lessonId,
      assignmentId: lesson.assignment._id,
      audioFileUrl,
    });
    res.status(201).json(submission);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ detail: "You've already submitted this assignment." });
    throw err;
  }
}

module.exports = { getAssignment, submit };
