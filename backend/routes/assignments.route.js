const router = require("express").Router();
const requireAuth = require("../middleware/auth");
const { getAssignment, submit } = require("../controllers/assignments.controller");

router.get("/:courseId/:lessonId", requireAuth, getAssignment);
router.post("/:courseId/:lessonId/submit", requireAuth, submit);

module.exports = router;
