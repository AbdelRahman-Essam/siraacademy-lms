const Enrollment = require("../models/Enrollment");
const Course = require("../models/Course");

// Self-enroll — only for free courses. Paid courses must go through
// payments.controller's checkout flow; this route rejects them.
async function enrollSelf(req, res) {
  const course = await Course.findById(req.params.courseId);
  if (!course) return res.status(404).json({ detail: "Course not found." });
  if (course.finalPrice > 0) {
    return res.status(400).json({ detail: "This course requires purchase. Use the checkout flow." });
  }
  const enrollment = await Enrollment.findOneAndUpdate(
    { student: req.user.id, course: course._id },
    { $setOnInsert: { source: "self", unlockedLessonOrder: 1 } },
    { upsert: true, new: true }
  );
  res.status(201).json(enrollment);
}

async function myEnrollments(req, res) {
  const enrollments = await Enrollment.find({ student: req.user.id }).populate(
    "course",
    "title thumbnailUrl"
  );
  res.json(enrollments);
}

async function unlockNext(req, res) {
  const enrollment = await Enrollment.findOne({ student: req.user.id, course: req.params.courseId });
  if (!enrollment) return res.status(404).json({ detail: "Not enrolled." });
  await enrollment.unlockNextLesson();
  res.json(enrollment);
}

module.exports = { enrollSelf, myEnrollments, unlockNext };
