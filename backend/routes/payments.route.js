const router = require("express").Router();
const requireAuth = require("../middleware/auth");
const c = require("../controllers/payments.controller");

router.post("/checkout/:courseId", requireAuth, c.checkout);
router.post("/webhook", c.webhook); // Paymob calls this server-to-server, no user JWT
router.get("/mine", requireAuth, c.myPurchases);
router.get("/:id/status", requireAuth, c.purchaseStatus);

module.exports = router;
