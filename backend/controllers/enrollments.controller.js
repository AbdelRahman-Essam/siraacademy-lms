const Enrollments = require("../models/enrollments");
const Courses = require("../models/courses");

// Self-enroll — only for free courses. Paid courses must go through
// payments.controller's checkout flow; this route rejects them.
async function enrollSelf(req, res) {
  const course = await Courses.getById(req.params.courseId);
  if (!course) return res.status(404).json({ detail: "Course not found." });
  if (course.finalPrice > 0) {
    return res.status(400).json({ detail: "This course requires purchase. Use the checkout flow." });
  }
  const enrollment = await Enrollments.ensure(req.user.id, course._id, { source: "self" });
  res.status(201).json(enrollment);
}

async function myEnrollments(req, res) {
  res.json(await Enrollments.listByStudent(req.user.id));
}

async function unlockNext(req, res) {
  const enrollment = await Enrollments.unlockNext(req.user.id, req.params.courseId);
  if (!enrollment) return res.status(404).json({ detail: "Not enrolled." });
  res.json(enrollment);
}

module.exports = { enrollSelf, myEnrollments, unlockNext };
