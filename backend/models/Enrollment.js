const mongoose = require("mongoose");

// Kept as its own top-level collection (not embedded) — created/removed
// independently of Course/User lifecycle, queried from both directions
// ("my enrollments", "students in this course").
const enrollmentSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    unlockedLessonOrder: { type: Number, default: 1 },
    source: { type: String, enum: ["self", "admin", "purchase"], default: "self" },
    enrolledAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });

enrollmentSchema.methods.unlockNextLesson = async function () {
  const Course = mongoose.model("Course");
  const course = await Course.findById(this.course).select("lessons");
  const total = course?.lessons?.length || 0;
  if (this.unlockedLessonOrder < total) {
    this.unlockedLessonOrder += 1;
    await this.save();
  }
  return this;
};

module.exports = mongoose.model("Enrollment", enrollmentSchema);
