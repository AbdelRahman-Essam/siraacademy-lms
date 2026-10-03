const Course = require("../models/Course");
const User = require("../models/User");
const PurchaseOrder = require("../models/PurchaseOrder");
const Enrollment = require("../models/Enrollment");
const paymob = require("../utils/paymob");

// Starts checkout — never creates the Enrollment here. Only the verified
// webhook does that (see webhook below), so a student can't fake success by
// editing the browser redirect URL, matching the original spec's design.
async function checkout(req, res) {
  const course = await Course.findById(req.params.courseId);
  if (!course) return res.status(404).json({ detail: "Course not found." });
  if (course.finalPrice <= 0) return res.status(400).json({ detail: "This course is free — use the enroll endpoint." });

  const amountCents = Math.round(course.finalPrice * 100);
  const order = await PurchaseOrder.create({
    student: req.user.id, course: course._id, amountCents, status: "pending",
  });

  const authToken = await paymob.authenticate();
  const paymobOrder = await paymob.registerOrder(authToken, amountCents, order._id.toString());
  order.paymobOrderId = String(paymobOrder.id);
  await order.save();

  const buyer = await User.findById(req.user.id).select("email username");
  const paymentKey = await paymob.requestPaymentKey(authToken, paymobOrder, amountCents, {
    email: buyer.email, first_name: buyer.username, last_name: buyer.username,
    phone_number: "+20000000000", apartment: "NA", floor: "NA", street: "NA", building: "NA",
    shipping_method: "NA", postal_code: "NA", city: "NA", country: "NA", state: "NA",
  });

  res.json({ checkoutUrl: paymob.checkoutUrlFor(paymentKey), purchaseOrderId: order._id });
}

// Server-to-server webhook — the ONLY place an Enrollment is created for a paid course.
async function webhook(req, res) {
  const query = req.body.obj || req.query; // Paymob posts a nested `obj`; support both shapes
  if (!paymob.verifyHmac(query)) return res.status(400).json({ detail: "Invalid signature." });

  const order = await PurchaseOrder.findOne({ paymobOrderId: String(query.order) });
  if (!order) return res.status(404).json({ detail: "Order not found." });

  if (query.success === true || query.success === "true") {
    order.status = "paid";
    order.paymobTransactionId = String(query.id);
    order.paidAt = new Date();
    await order.save();
    await Enrollment.findOneAndUpdate(
      { student: order.student, course: order.course },
      { $setOnInsert: { source: "purchase", unlockedLessonOrder: 1 } },
      { upsert: true }
    );
  } else {
    order.status = "failed";
    await order.save();
  }
  res.json({ received: true });
}

async function myPurchases(req, res) {
  const orders = await PurchaseOrder.find({ student: req.user.id }).populate("course", "title");
  res.json(orders);
}

async function purchaseStatus(req, res) {
  const order = await PurchaseOrder.findById(req.params.id);
  if (!order) return res.status(404).json({ detail: "Order not found." });
  res.json({ status: order.status });
}

module.exports = { checkout, webhook, myPurchases, purchaseStatus };
