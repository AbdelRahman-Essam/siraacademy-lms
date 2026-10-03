const { query: q } = require("../config/db");

const map = (r, extra = {}) =>
  r && {
    _id: r.id,
    id: r.id,
    student: r.student_id,
    course: r.course_id,
    amountCents: r.amount_cents,
    currency: r.currency,
    status: r.status,
    paymobOrderId: r.paymob_order_id,
    paymobTransactionId: r.paymob_transaction_id,
    paidAt: r.paid_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    ...extra,
  };

async function create({ studentId, courseId, amountCents }) {
  const { rows } = await q(
    `INSERT INTO purchase_orders (student_id, course_id, amount_cents, status)
     VALUES ($1, $2, $3, 'pending') RETURNING *`,
    [studentId, courseId, amountCents]
  );
  return map(rows[0]);
}

async function setPaymobOrderId(id, paymobOrderId) {
  await q("UPDATE purchase_orders SET paymob_order_id = $2, updated_at = now() WHERE id = $1", [id, paymobOrderId]);
}

async function findById(id) {
  const { rows } = await q("SELECT * FROM purchase_orders WHERE id = $1", [id]);
  return map(rows[0]);
}

async function findByPaymobOrderId(paymobOrderId) {
  const { rows } = await q("SELECT * FROM purchase_orders WHERE paymob_order_id = $1", [paymobOrderId]);
  return map(rows[0]);
}

async function markPaid(id, transactionId) {
  await q(
    `UPDATE purchase_orders SET status = 'paid', paymob_transaction_id = $2, paid_at = now(), updated_at = now()
      WHERE id = $1`,
    [id, transactionId]
  );
}

async function markFailed(id) {
  await q("UPDATE purchase_orders SET status = 'failed', updated_at = now() WHERE id = $1", [id]);
}

async function listByStudent(studentId) {
  const { rows } = await q(
    `SELECT p.*, c.title AS course_title
       FROM purchase_orders p JOIN courses c ON c.id = p.course_id
      WHERE p.student_id = $1 ORDER BY p.created_at, p.id`,
    [studentId]
  );
  return rows.map((r) => map(r, { course: { _id: r.course_id, title: r.course_title } }));
}

module.exports = { create, setPaymobOrderId, findById, findByPaymobOrderId, markPaid, markFailed, listByStudent };
