const Courses = require("../models/courses");
const Users = require("../models/users");
const PurchaseOrders = require("../models/purchaseOrders");
const Enrollments = require("../models/enrollments");
const paymob = require("../utils/paymob");

// Starts checkout — never creates the Enrollment here. Only the verified
// webhook does that (see webhook below), so a student can't fake success by
// editing the browser redirect URL, matching the original spec's design.
async function checkout(req, res) {
  const course = await Courses.getById(req.params.courseId);
  if (!course) return res.status(404).json({ detail: "Course not found." });
  if (course.finalPrice <= 0) return res.status(400).json({ detail: "This course is free — use the enroll endpoint." });

  const amountCents = Math.round(course.finalPrice * 100);
  const order = await PurchaseOrders.create({
    studentId: req.user.id, courseId: course._id, amountCents,
  });

  const authToken = await paymob.authenticate();
  const paymobOrder = await paymob.registerOrder(authToken, amountCents, order._id.toString());
  await PurchaseOrders.setPaymobOrderId(order._id, String(paymobOrder.id));

  const buyer = await Users.findById(req.user.id);
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

  const order = await PurchaseOrders.findByPaymobOrderId(String(query.order));
  if (!order) return res.status(404).json({ detail: "Order not found." });

  if (query.success === true || query.success === "true") {
    await PurchaseOrders.markPaid(order._id, String(query.id));
    await Enrollments.ensure(order.student, order.course, { source: "purchase" });
  } else {
    await PurchaseOrders.markFailed(order._id);
  }
  res.json({ received: true });
}

async function myPurchases(req, res) {
  res.json(await PurchaseOrders.listByStudent(req.user.id));
}

async function purchaseStatus(req, res) {
  const order = await PurchaseOrders.findById(req.params.id);
  if (!order) return res.status(404).json({ detail: "Order not found." });
  res.json({ status: order.status });
}

module.exports = { checkout, webhook, myPurchases, purchaseStatus };
