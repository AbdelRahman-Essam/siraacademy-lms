const router = require("express").Router();
const requireAuth = require("../middleware/auth");
const requireRole = require("../middleware/roles");
const upload = require("../middleware/upload");
const admin = requireRole("admin");
const c = require("../controllers/admin.controller");
const driveOAuth = require("../controllers/driveOAuth.controller");

// OAuth start/callback must come BEFORE the admin-only gate: Google calls the
// callback directly (it can't carry a Bearer token), and the gate would
// reject it with 401. The route itself is safe to leave ungated because it
// only ever creates a StorageAccount from a one-time Google-issued code; it
// grants no access to anything else in the API.
router.get("/drive/oauth/start", driveOAuth.start); // auth checked manually inside — see controller comment
router.get("/drive/oauth/callback", driveOAuth.callback);

router.use(requireAuth, admin); // everything below is admin-only

router.get("/courses", c.listCourses);
router.get("/courses/:id", c.getCourse);
router.post("/courses", c.createCourse);
router.put("/courses/:id", c.updateCourse);
router.delete("/courses/:id", c.deleteCourse);

router.post("/courses/:courseId/lessons", c.addLesson);
router.put("/courses/:courseId/lessons/:lessonId", c.updateLesson);
router.delete("/courses/:courseId/lessons/:lessonId", c.deleteLesson);

router.post("/upload", upload.single("file"), c.uploadMedia);
router.post("/courses/:courseId/lessons/:lessonId/attachments", c.addAttachment);
router.delete("/courses/:courseId/lessons/:lessonId/attachments/:attachmentId", c.deleteAttachment);

router.post("/courses/:courseId/lessons/:lessonId/video", upload.single("video"), c.uploadLessonVideo);
router.get("/upload-progress/:uploadId", c.getUploadProgress);

router.post("/storage-accounts", c.addStorageAccount);
router.get("/storage-accounts", c.listStorageAccounts);

router.post("/enroll", c.enrollStudent);
router.get("/enrollments", c.listEnrollments);
router.delete("/enrollments/:id", c.unenroll);

module.exports = router;
