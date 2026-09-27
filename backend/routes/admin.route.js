const router = require("express").Router();
const requireAuth = require("../middleware/auth");
const requireRole = require("../middleware/roles");
const upload = require("../middleware/upload");
const admin = requireRole("admin");
const c = require("../controllers/admin.controller");

router.use(requireAuth, admin); // everything below is admin-only

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
