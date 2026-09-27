const router = require("express").Router();
const { register, login, refresh } = require("../controllers/auth.controller");
const { authLimiter } = require("../middleware/rateLimiter");

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/refresh", authLimiter, refresh);

module.exports = router;
