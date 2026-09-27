const router = require("express").Router();
const requireAuth = require("../middleware/auth");
const requireRole = require("../middleware/roles");
const c = require("../controllers/teacher.controller");

router.use(requireAuth, requireRole("teacher", "admin"));

router.get("/meeting-links", c.listMeetingLinks);
router.put("/courses/:courseId/lessons/:lessonId/meeting-link", c.updateMeetingLink);
router.get("/student-records", c.studentRecords);
router.get("/submissions", c.listSubmissions);
router.put("/submissions/:id/grade", c.gradeSubmission);

module.exports = router;
