const fs = require("fs");
const path = require("path");
const cloudinary = require("cloudinary").v2;
const crypto = require("crypto");
const Courses = require("../models/courses");
const Enrollments = require("../models/enrollments");
const Users = require("../models/users");
const StorageAccounts = require("../models/storageAccounts");
const { processVideo } = require("../utils/videoProcessing");
const { createLessonFolder, uploadSegment } = require("../utils/drive");
const uploadProgress = require("../utils/uploadProgress");
const { encrypt } = require("../utils/crypto");

// ---- Courses & Lessons ----

// Full admin view — unlike the public catalog/student detail, this includes
// pricing, Drive folder/account wiring, and every lesson field so the admin
// UI has everything it needs to edit.
async function listCourses(req, res) {
  res.json(await Courses.list({ populateStorage: true }));
}

async function getCourse(req, res) {
  const course = await Courses.getById(req.params.id, { populateStorage: true });
  if (!course) return res.status(404).json({ detail: "Course not found." });
  res.json(course);
}

async function createCourse(req, res) {
  const course = await Courses.create(req.body);
  res.status(201).json(course);
}

async function updateCourse(req, res) {
  const course = await Courses.update(req.params.id, req.body);
  if (!course) return res.status(404).json({ detail: "Course not found." });
  res.json(course);
}

async function deleteCourse(req, res) {
  await Courses.remove(req.params.id);
  res.status(204).end();
}

async function addLesson(req, res) {
  const lesson = await Courses.addLesson(req.params.courseId, req.body);
  if (!lesson) return res.status(404).json({ detail: "Course not found." });
  res.status(201).json(lesson);
}

async function updateLesson(req, res) {
  const lesson = await Courses.updateLesson(req.params.courseId, req.params.lessonId, req.body);
  if (!lesson) return res.status(404).json({ detail: "Lesson not found." });
  res.json(lesson);
}

async function deleteLesson(req, res) {
  await Courses.removeLesson(req.params.courseId, req.params.lessonId);
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
  const attachment = await Courses.addAttachment(req.params.courseId, req.params.lessonId, {
    fileUrl: req.body.url,
    kind: req.body.kind,
    originalFilename: req.body.originalFilename,
  });
  if (!attachment) return res.status(404).json({ detail: "Lesson not found." });
  res.status(201).json(attachment);
}

async function deleteAttachment(req, res) {
  await Courses.removeAttachment(req.params.courseId, req.params.lessonId, req.params.attachmentId);
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

      const ctx = await Courses.getUploadContext(courseId, lessonId);
      if (!ctx) throw new Error("Lesson not found.");
      const storageAccount = await StorageAccounts.findById(ctx.storageAccountId);
      if (!storageAccount) throw new Error("Course has no linked Google account (StorageAccount).");

      uploadProgress.set(uploadId, { status: "creating_drive_folder", percent: 15 });
      const lessonFolderId = await createLessonFolder(storageAccount, ctx.driveFolderId, ctx.lessonTitle);
      const result = { driveLessonFolderId: lessonFolderId };

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
        if (isPlaylist) result.playlistDriveFileId = fileId;
        else segments.push({ index: i++, driveFileId: fileId });

        uploadProgress.set(uploadId, {
          status: "uploading_to_drive",
          percent: 15 + Math.round((80 * (files.indexOf(filename) + 1)) / files.length),
        });
      }
      result.segments = segments;

      const keyFile = path.join(outDir, "key.txt"); // written by process_video.py per its own spec
      if (fs.existsSync(keyFile)) {
        const [keyId, key] = fs.readFileSync(keyFile, "utf8").trim().split(":");
        result.encryptionKeyId = keyId;
        result.encryptionKey = key;
      }

      await Courses.saveLessonVideo(lessonId, result);
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
  const account = await StorageAccounts.create({
    label, ownerEmail, refreshTokenEnc: encrypt(refreshToken),
  });
  res.status(201).json({ id: account._id, label: account.label, ownerEmail: account.ownerEmail });
}

async function listStorageAccounts(req, res) {
  res.json(await StorageAccounts.list());
}

// ---- Enrollment (admin-driven) ----

async function enrollStudent(req, res) {
  const { username, courseId } = req.body;
  const student = await Users.findByUsername(username);
  if (!student) return res.status(404).json({ detail: "Student not found." });
  const enrollment = await Enrollments.ensure(student._id, courseId, { source: "admin" });
  res.status(201).json(enrollment);
}

async function listEnrollments(req, res) {
  res.json(await Enrollments.listAll());
}

async function unenroll(req, res) {
  await Enrollments.remove(req.params.id);
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
