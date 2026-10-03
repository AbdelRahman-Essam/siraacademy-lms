const Courses = require("../models/courses");
const Enrollments = require("../models/enrollments");
const Submissions = require("../models/submissions");

// Teachers never touch content — only the meeting_link field per lesson.
async function listMeetingLinks(req, res) {
  res.json(await Courses.listMeetingLinks());
}

async function updateMeetingLink(req, res) {
  const meetingLink = req.body.meetingLink || "";
  const ok = await Courses.setMeetingLink(req.params.courseId, req.params.lessonId, meetingLink);
  if (!ok) return res.status(404).json({ detail: "Lesson not found." });
  res.json({ meetingLink });
}

// Read-only student progress.
async function studentRecords(req, res) {
  res.json(await Enrollments.listRecords());
}

// Grading queue.
async function listSubmissions(req, res) {
  res.json(await Submissions.listPending());
}

async function gradeSubmission(req, res) {
  const submission = await Submissions.grade(req.params.id, req.body);
  if (!submission) return res.status(404).json({ detail: "Submission not found." });
  res.json(submission);
}

module.exports = { listMeetingLinks, updateMeetingLink, studentRecords, listSubmissions, gradeSubmission };
