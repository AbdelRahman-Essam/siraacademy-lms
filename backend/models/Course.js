const mongoose = require("mongoose");

// Embedded: attachments belong to a lesson, are admin-managed, bounded in number.
const attachmentSchema = new mongoose.Schema(
  {
    fileUrl: String,
    kind: { type: String, enum: ["photo", "video", "document", "other"], default: "other" },
    originalFilename: String,
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

// Embedded: one homework prompt per lesson.
const assignmentSchema = new mongoose.Schema(
  {
    audioPromptUrl: String,
    instructions: { type: String, default: "" },
  },
  { _id: true }
);

// A single HLS segment stored on Google Drive.
const segmentSchema = new mongoose.Schema(
  { index: Number, driveFileId: String },
  { _id: false }
);

// Embedded: lessons belong to a course, admin-managed, rarely change, bounded per course.
const lessonSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    order: { type: Number, required: true },
    // Master HLS playlist file id in the lesson's Drive folder (not served directly —
    // Express rewrites this into a self-hosted playlist; see utils/drive.js).
    playlistDriveFileId: { type: String, default: "" },
    segments: [segmentSchema],
    encryptionKeyId: { type: String, default: "" },
    encryptionKey: { type: String, default: "" }, // only ever released after token re-verification
    meetingLink: { type: String, default: "" }, // teacher-managed
    driveLessonFolderId: { type: String, default: "" }, // auto-created by the system
    attachments: [attachmentSchema],
    assignment: assignmentSchema,
  },
  { _id: true }
);

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    thumbnailUrl: { type: String, default: "" },
    promoVideoUrl: { type: String, default: "" },
    price: { type: Number, default: 0 },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    // Admin-provided top-level Drive folder for this course; lesson subfolders live inside it.
    driveFolderId: { type: String, default: "" },
    storageAccount: { type: mongoose.Schema.Types.ObjectId, ref: "StorageAccount" },
    lessons: [lessonSchema],
  },
  { timestamps: true }
);

courseSchema.virtual("finalPrice").get(function () {
  if (!this.discountPercent) return this.price;
  return Math.round(this.price * (100 - this.discountPercent)) / 100;
});
courseSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("Course", courseSchema);
