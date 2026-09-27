const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const StudentSubmission = require("../models/StudentSubmission");

// Teachers never touch content — only the meeting_link field per lesson.
async function listMeetingLinks(req, res) {
  const courses = await Course.find().select("title lessons._id lessons.title lessons.order lessons.meetingLink");
  res.json(courses);
}

async function updateMeetingLink(req, res) {
  const course = await Course.findById(req.params.courseId);
  const lesson = course?.lessons.id(req.params.lessonId);
  if (!lesson) return res.status(404).json({ detail: "Lesson not found." });
  lesson.meetingLink = req.body.meetingLink || "";
  await course.save();
  res.json({ meetingLink: lesson.meetingLink });
}

// Read-only student progress.
async function studentRecords(req, res) {
  const enrollments = await Enrollment.find().populate("student", "username").populate("course", "title lessons");
  res.json(
    enrollments.map((e) => ({
      student: e.student.username,
      course: e.course.title,
      unlockedLessonOrder: e.unlockedLessonOrder,
      totalLessons: e.course.lessons.length,
    }))
  );
}

// Grading queue.
async function listSubmissions(req, res) {
  const submissions = await StudentSubmission.find({ status: "submitted" })
    .populate("student", "username")
    .populate("course", "title");
  res.json(submissions);
}

async function gradeSubmission(req, res) {
  const submission = await StudentSubmission.findById(req.params.id);
  if (!submission) return res.status(404).json({ detail: "Submission not found." });
  submission.teacherFeedback = req.body.teacherFeedback || "";
  submission.grade = req.body.grade || "";
  submission.status = "graded";
  await submission.save();
  res.json(submission);
}

module.exports = { listMeetingLinks, updateMeetingLink, studentRecords, listSubmissions, gradeSubmission };
