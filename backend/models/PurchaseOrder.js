const mongoose = require("mongoose");

// Own collection — a transactional/audit log, not naturally embeddable.
const purchaseOrderSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    amountCents: { type: Number, required: true },
    currency: { type: String, default: "EGP" },
    status: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
    paymobOrderId: { type: String, default: "" },
    paymobTransactionId: { type: String, default: "" },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PurchaseOrder", purchaseOrderSchema);
