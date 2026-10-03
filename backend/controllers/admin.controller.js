const fs = require("fs");
const path = require("path");
const cloudinary = require("cloudinary").v2;
const crypto = require("crypto");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const User = require("../models/User");
const StorageAccount = require("../models/StorageAccount");
const { processVideo } = require("../utils/videoProcessing");
const { createLessonFolder, uploadSegment } = require("../utils/drive");
const uploadProgress = require("../utils/uploadProgress");
const { encrypt } = require("../utils/crypto");

// ---- Courses & Lessons ----

// Full admin view — unlike the public catalog/student detail, this includes
// pricing, Drive folder/account wiring, and every lesson field so the admin
// UI has everything it needs to edit.
async function listCourses(req, res) {
  const courses = await Course.find().populate("storageAccount", "label ownerEmail");
  res.json(courses);
}

async function getCourse(req, res) {
  const course = await Course.findById(req.params.id).populate("storageAccount", "label ownerEmail");
  if (!course) return res.status(404).json({ detail: "Course not found." });
  res.json(course);
}

async function createCourse(req, res) {
  const course = await Course.create(req.body);
  res.status(201).json(course);
}

async function updateCourse(req, res) {
  const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!course) return res.status(404).json({ detail: "Course not found." });
  res.json(course);
}

async function deleteCourse(req, res) {
  await Course.findByIdAndDelete(req.params.id);
  res.status(204).end();
}

async function addLesson(req, res) {
  const course = await Course.findById(req.params.courseId);
  if (!course) return res.status(404).json({ detail: "Course not found." });
  course.lessons.push(req.body);
  await course.save();
  res.status(201).json(course.lessons[course.lessons.length - 1]);
}

async function updateLesson(req, res) {
  const course = await Course.findById(req.params.courseId);
  const lesson = course?.lessons.id(req.params.lessonId);
  if (!lesson) return res.status(404).json({ detail: "Lesson not found." });
  Object.assign(lesson, req.body);
  await course.save();
  res.json(lesson);
}

async function deleteLesson(req, res) {
  const course = await Course.findById(req.params.courseId);
  course?.lessons.id(req.params.lessonId)?.deleteOne();
  await course.save();
  res.status(204).end();
}

// ---- Media: thumbnails/attachments go to Cloudinary (not security-sensitive) ----

async function uploadMedia(req, res) {
  if (!req.file) return res.status(400).json({ detail: "No file uploaded." });
  const result = await cloudinary.uploader.upload(req.file.path, { resource_type: "auto" });
  fs.unlink(req.file.path, () => {});
  res.json({ url: result.secure_url, kind: req.body.kind || "other" });
}

async function addAttachment(req, res) {
  const course = await Course.findById(req.params.courseId);
  const lesson = course?.lessons.id(req.params.lessonId);
  if (!lesson) return res.status(404).json({ detail: "Lesson not found." });
  lesson.attachments.push({
    fileUrl: req.body.url,
    kind: req.body.kind || "other",
    originalFilename: req.body.originalFilename || "",
  });
  await course.save();
  res.status(201).json(lesson.attachments[lesson.attachments.length - 1]);
}

async function deleteAttachment(req, res) {
  const course = await Course.findById(req.params.courseId);
  const lesson = course?.lessons.id(req.params.lessonId);
  lesson?.attachments.id(req.params.attachmentId)?.deleteOne();
  await course.save();
  res.status(204).end();
}

// ---- Protected lesson video: raw upload -> FFmpeg/Shaka -> Drive ----
// Reports progress to uploadProgress so the frontend status bar can poll it.

async function uploadLessonVideo(req, res) {
  if (!req.file) return res.status(400).json({ detail: "No video file uploaded." });
  const { courseId, lessonId } = req.params;
  const uploadId = crypto.randomUUID();
  res.status(202).json({ uploadId }); // respond immediately; client polls progress

  (async () => {
    try {
      uploadProgress.set(uploadId, { status: "encrypting", percent: 5 });
      const outDir = path.join(require("os").tmpdir(), `hls-${uploadId}`);
      fs.mkdirSync(outDir, { recursive: true });
      await processVideo(req.file.path, outDir); // FFmpeg + Shaka Packager, unchanged from spec

      const course = await Course.findById(courseId);
      const lesson = course.lessons.id(lessonId);
      const storageAccount = await StorageAccount.findById(course.storageAccount);
      if (!storageAccount) throw new Error("Course has no linked Google account (StorageAccount).");

      uploadProgress.set(uploadId, { status: "creating_drive_folder", percent: 15 });
      const lessonFolderId = await createLessonFolder(storageAccount, course.driveFolderId, lesson.title);
      lesson.driveLessonFolderId = lessonFolderId;

      const files = fs.readdirSync(outDir).sort();
      const segments = [];
      let i = 0;
      for (const filename of files) {
        const stream = fs.createReadStream(path.join(outDir, filename));
        const isPlaylist = filename.endsWith(".m3u8");
        const fileId = await uploadSegment(
          storageAccount, lessonFolderId, filename, stream,
          isPlaylist ? "application/vnd.apple.mpegurl" : "video/mp2t"
        );
        if (isPlaylist) lesson.playlistDriveFileId = fileId;
        else segments.push({ index: i++, driveFileId: fileId });

        uploadProgress.set(uploadId, {
          status: "uploading_to_drive",
          percent: 15 + Math.round((80 * (files.indexOf(filename) + 1)) / files.length),
        });
      }
      lesson.segments = segments;

      const keyFile = path.join(outDir, "key.txt"); // written by process_video.py per its own spec
      if (fs.existsSync(keyFile)) {
        const [keyId, key] = fs.readFileSync(keyFile, "utf8").trim().split(":");
        lesson.encryptionKeyId = keyId;
        lesson.encryptionKey = key;
      }

      await course.save();
      uploadProgress.set(uploadId, { status: "done", percent: 100 });
      fs.rmSync(outDir, { recursive: true, force: true });
      fs.unlink(req.file.path, () => {});
    } catch (err) {
      uploadProgress.set(uploadId, { status: "error", error: err.message });
    }
  })();
}

async function getUploadProgress(req, res) {
  res.json(uploadProgress.get(req.params.uploadId));
}

// ---- Storage accounts (Drive, one per course, free-tier workaround) ----

async function addStorageAccount(req, res) {
  const { label, ownerEmail, refreshToken } = req.body;
  const account = await StorageAccount.create({
    label, ownerEmail, refreshTokenEnc: encrypt(refreshToken),
  });
  res.status(201).json({ id: account._id, label: account.label, ownerEmail: account.ownerEmail });
}

async function listStorageAccounts(req, res) {
  const accounts = await StorageAccount.find().select("label ownerEmail createdAt");
  res.json(accounts);
}

// ---- Enrollment (admin-driven) ----

async function enrollStudent(req, res) {
  const { username, courseId } = req.body;
  const student = await User.findOne({ username });
  if (!student) return res.status(404).json({ detail: "Student not found." });
  const enrollment = await Enrollment.findOneAndUpdate(
    { student: student._id, course: courseId },
    { $setOnInsert: { source: "admin", unlockedLessonOrder: 1 } },
    { upsert: true, new: true }
  );
  res.status(201).json(enrollment);
}

async function listEnrollments(req, res) {
  const enrollments = await Enrollment.find().populate("student", "username email").populate("course", "title");
  res.json(enrollments);
}

async function unenroll(req, res) {
  await Enrollment.findByIdAndDelete(req.params.id);
  res.status(204).end();
}

module.exports = {
  listCourses, getCourse,
  createCourse, updateCourse, deleteCourse,
  addLesson, updateLesson, deleteLesson,
  uploadMedia, addAttachment, deleteAttachment,
  uploadLessonVideo, getUploadProgress,
  addStorageAccount, listStorageAccounts,
  enrollStudent, listEnrollments, unenroll,
};
