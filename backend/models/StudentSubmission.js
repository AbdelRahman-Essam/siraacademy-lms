const mongoose = require("mongoose");

// Own collection — per-student, high-cardinality; embedding this inside the
// (already-embedded) assignment would write into the parent Course document
// on every homework submission. See platform-specification-v2.md section 5.
const studentSubmissionSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    lessonId: { type: mongoose.Schema.Types.ObjectId, required: true }, // embedded lesson subdoc _id
    assignmentId: { type: mongoose.Schema.Types.ObjectId, required: true }, // embedded assignment subdoc _id
    audioFileUrl: { type: String, required: true },
    submittedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ["submitted", "graded"], default: "submitted" },
    teacherFeedback: { type: String, default: "" },
    grade: { type: String, default: "" },
  },
  { timestamps: true }
);

studentSubmissionSchema.index({ student: 1, assignmentId: 1 }, { unique: true });

module.exports = mongoose.model("StudentSubmission", studentSubmissionSchema);
