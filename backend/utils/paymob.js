const axios = require("axios");
const crypto = require("crypto");

// Ported from the original Python paymob.py client — same auth -> order ->
// payment-key flow, now via axios instead of `requests`.
const BASE = "https://accept.paymob.com/api";

async function authenticate() {
  const { data } = await axios.post(`${BASE}/auth/tokens`, { api_key: process.env.PAYMOB_API_KEY });
  return data.token;
}

async function registerOrder(authToken, amountCents, merchantOrderId) {
  const { data } = await axios.post(`${BASE}/ecommerce/orders`, {
    auth_token: authToken,
    delivery_needed: false,
    amount_cents: amountCents,
    currency: "EGP",
    merchant_order_id: merchantOrderId,
    items: [],
  });
  return data;
}

async function requestPaymentKey(authToken, order, amountCents, billingData) {
  const { data } = await axios.post(`${BASE}/acceptance/payment_keys`, {
    auth_token: authToken,
    amount_cents: amountCents,
    expiration: 3600,
    order_id: order.id,
    billing_data: billingData,
    currency: "EGP",
    integration_id: process.env.PAYMOB_INTEGRATION_ID,
  });
  return data.token;
}

function checkoutUrlFor(paymentKey) {
  return `https://accept.paymob.com/api/acceptance/iframes/${process.env.PAYMOB_IFRAME_ID}?payment_token=${paymentKey}`;
}

// HMAC verification per Paymob's "Transaction Processed Callback" — flagged in
// the spec as needing a final check against Paymob's current docs before
// accepting real payments.
function verifyHmac(query) {
  const orderedKeys = [
    "amount_cents", "created_at", "currency", "error_occured", "has_parent_transaction",
    "id", "integration_id", "is_3d_secure", "is_auth", "is_capture", "is_refunded",
    "is_standalone_payment", "is_voided", "order", "owner", "pending",
    "source_data.pan", "source_data.sub_type", "source_data.type", "success",
  ];
  const concatenated = orderedKeys.map((k) => String(query[k] ?? "")).join("");
  const computed = crypto
    .createHmac("sha512", process.env.PAYMOB_HMAC_SECRET)
    .update(concatenated)
    .digest("hex");
  return computed === query.hmac;
}

module.exports = { authenticate, registerOrder, requestPaymentKey, checkoutUrlFor, verifyHmac };
