const router = require("express").Router();
const { catalog, detail } = require("../controllers/courses.controller");
const requireAuth = require("../middleware/auth");

router.get("/catalog", catalog); // public
router.get("/:id", requireAuth, detail);

module.exports = router;
