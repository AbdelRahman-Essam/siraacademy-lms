const router = require("express").Router();
const requireAuth = require("../middleware/auth");
const { enrollSelf, myEnrollments, unlockNext } = require("../controllers/enrollments.controller");

router.post("/:courseId/enroll", requireAuth, enrollSelf);
router.get("/mine", requireAuth, myEnrollments);
router.post("/:courseId/unlock-next", requireAuth, unlockNext);

module.exports = router;
