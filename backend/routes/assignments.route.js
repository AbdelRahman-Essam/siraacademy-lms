const router = require("express").Router();
const requireAuth = require("../middleware/auth");
const upload = require("../middleware/upload");
const { getAssignment, submit, uploadAudio } = require("../controllers/assignments.controller");

router.get("/:courseId/:lessonId", requireAuth, getAssignment);
router.post("/:courseId/:lessonId/upload-audio", requireAuth, upload.single("audio"), uploadAudio);
router.post("/:courseId/:lessonId/submit", requireAuth, submit);

module.exports = router;
