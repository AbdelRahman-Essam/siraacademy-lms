"""
Thin wrapper around Paymob's "Accept" REST API (the classic 3-step flow:
auth token -> order registration -> payment key), used because it works
with a plain server-rendered iframe redirect and doesn't require pulling
in Paymob's JS SDK on the frontend.

IMPORTANT: verify the HMAC field order in `verify_hmac` against your
Paymob dashboard's current webhook documentation before relying on this
in production. Payment-callback verification is security-critical — if
Paymob has changed the field list/order since this was written, forged
webhook requests could be accepted (or legitimate ones rejected). This
implementation follows Paymob's long-documented "Transaction Processed
Callback" field order, but Paymob is the source of truth.
"""

import hashlib
import hmac as hmac_lib

import requests
from django.conf import settings

PAYMOB_BASE_URL = "https://accept.paymob.com/api"

# Order matters — this must match Paymob's documented HMAC field list
# for the transaction "processed" callback exactly. Re-check against
# https://developers.paymob.com before going live.
HMAC_FIELD_ORDER = [
    "amount_cents", "created_at", "currency", "error_occured",
    "has_parent_transaction", "id", "integration_id", "is_3d_secure",
    "is_auth", "is_capture", "is_refunded", "is_standalone_payment",
    "is_voided", "order.id", "owner", "pending",
    "source_data.pan", "source_data.sub_type", "source_data.type",
    "success",
]


class PaymobError(Exception):
    pass


def authenticate():
    """Step 1: exchange the API key for a short-lived auth token."""
    resp = requests.post(
        f"{PAYMOB_BASE_URL}/auth/tokens",
        json={"api_key": settings.PAYMOB_API_KEY},
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()["token"]


def create_order(auth_token, amount_cents, merchant_order_id):
    """Step 2: register an order on Paymob's side."""
    resp = requests.post(
        f"{PAYMOB_BASE_URL}/ecommerce/orders",
        json={
            "auth_token": auth_token,
            "delivery_needed": False,
            "amount_cents": amount_cents,
            "currency": "EGP",
            "merchant_order_id": str(merchant_order_id),
            "items": [],
        },
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()["id"]


def get_payment_key(auth_token, paymob_order_id, amount_cents, billing_data):
    """Step 3: get the payment_key token used to launch the iframe."""
    resp = requests.post(
        f"{PAYMOB_BASE_URL}/acceptance/payment_keys",
        json={
            "auth_token": auth_token,
            "amount_cents": amount_cents,
            "expiration": 3600,
            "order_id": paymob_order_id,
            "billing_data": billing_data,
            "currency": "EGP",
            "integration_id": settings.PAYMOB_INTEGRATION_ID,
        },
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()["token"]


def start_checkout(*, amount_cents, merchant_order_id, billing_data):
    """Runs all three steps and returns the iframe URL to redirect the student to."""
    auth_token = authenticate()
    paymob_order_id = create_order(auth_token, amount_cents, merchant_order_id)
    payment_key = get_payment_key(auth_token, paymob_order_id, amount_cents, billing_data)
    iframe_url = (
        f"{PAYMOB_BASE_URL}/acceptance/iframes/{settings.PAYMOB_IFRAME_ID}"
        f"?payment_token={payment_key}"
    )
    return paymob_order_id, iframe_url


def verify_hmac(data, received_hmac):
    """
    Recomputes the HMAC-SHA512 over the transaction callback payload and
    compares it (constant-time) to the hmac Paymob sent — this is what
    proves the webhook actually came from Paymob and wasn't forged.
    `data` is the flat "obj" dict from the callback payload.
    """
    def flatten_get(d, dotted_key):
        value = d
        for part in dotted_key.split('.'):
            value = value.get(part, '') if isinstance(value, dict) else ''
        return value

    concatenated = ''.join(
        str(flatten_get(data, field)) if flatten_get(data, field) is not None else ''
        for field in HMAC_FIELD_ORDER
    )
    computed = hmac_lib.new(
        settings.PAYMOB_HMAC_SECRET.encode(), concatenated.encode(), hashlib.sha512
    ).hexdigest()
    return hmac_lib.compare_digest(computed, received_hmac or '')
