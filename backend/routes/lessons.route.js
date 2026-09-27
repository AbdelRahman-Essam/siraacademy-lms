const router = require("express").Router();
const requireAuth = require("../middleware/auth");
const {
  getVideoToken, getPlaylist, getSegment, getKey,
} = require("../controllers/lessons.controller");

router.get("/:courseId/:lessonId/token", requireAuth, getVideoToken);
router.get("/:lessonId/playlist.m3u8", getPlaylist); // token is in the query string, verified inside
router.get("/:lessonId/segments/:index", getSegment); // same — token-gated, not session-gated
router.get("/:courseId/:lessonId/key", requireAuth, getKey);

module.exports = router;
