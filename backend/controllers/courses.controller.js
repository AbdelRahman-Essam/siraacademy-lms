const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");

// Public catalog — the main "Courses" browse page. Strips admin-only fields
// (encryption keys, drive folder ids) before sending to the client.
async function catalog(req, res) {
  const courses = await Course.find().select(
    "title description thumbnailUrl promoVideoUrl price discountPercent lessons.title lessons.order"
  );
  const shaped = courses.map((c) => ({
    id: c._id,
    title: c.title,
    description: c.description,
    thumbnailUrl: c.thumbnailUrl,
    promoVideoUrl: c.promoVideoUrl,
    price: c.price,
    finalPrice: c.finalPrice,
    lessonCount: c.lessons.length,
  }));
  res.json(shaped);
}

// Course detail as seen by an enrolled student — lesson list reflects
// server-side lock state via the student's Enrollment.unlockedLessonOrder.
// Video content_url/encryption fields are NEVER sent here; only the video
// token endpoint (lessons.controller) hands those out, and only per-request.
async function detail(req, res) {
  const course = await Course.findById(req.params.id);
  if (!course) return res.status(404).json({ detail: "Course not found." });

  let unlockedUpTo = 0;
  if (req.user?.role === "student") {
    const enrollment = await Enrollment.findOne({ student: req.user.id, course: course._id });
    unlockedUpTo = enrollment ? enrollment.unlockedLessonOrder : 0;
  } else {
    unlockedUpTo = course.lessons.length; // admin/teacher previewing structure, not content
  }

  const lessons = course.lessons
    .sort((a, b) => a.order - b.order)
    .map((l) => ({
      id: l._id,
      title: l.title,
      order: l.order,
      locked: l.order > unlockedUpTo,
      meetingLink: l.order <= unlockedUpTo ? l.meetingLink : null,
      hasAssignment: !!l.assignment?.audioPromptUrl,
    }));

  res.json({
    id: course._id,
    title: course.title,
    description: course.description,
    thumbnailUrl: course.thumbnailUrl,
    price: course.price,
    finalPrice: course.finalPrice,
    lessons,
  });
}

module.exports = { catalog, detail };
