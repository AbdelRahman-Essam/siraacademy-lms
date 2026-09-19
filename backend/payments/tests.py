"""
Tests for the Paymob checkout + webhook flow — this is the one place in
the platform that moves real money, so it gets the most scrutiny:
- checkout must refuse to start for free/already-enrolled courses
- the webhook must reject anything without a valid HMAC signature
- an enrollment must only ever be created by a *verified* webhook call,
  never by anything the browser alone can produce
"""

import hashlib
import hmac as hmac_lib
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from courses.models import Course
from enrollments.models import Enrollment
from payments.models import PurchaseOrder
from payments.paymob import HMAC_FIELD_ORDER

User = get_user_model()

TEST_HMAC_SECRET = 'test-hmac-secret-do-not-use-in-prod'


def make_user(username, role='student', **kwargs):
    return User.objects.create_user(username=username, password='testpass123', role=role, **kwargs)


def build_transaction_obj(*, order_pk, success=True, is_voided=False, is_refunded=False):
    """A minimal but structurally-real Paymob transaction callback 'obj'."""
    return {
        'id': 999888,
        'amount_cents': 30000,
        'created_at': '2026-01-01T12:00:00.000000',
        'currency': 'EGP',
        'error_occured': False,
        'has_parent_transaction': False,
        'integration_id': 12345,
        'is_3d_secure': True,
        'is_auth': False,
        'is_capture': False,
        'is_refunded': is_refunded,
        'is_standalone_payment': True,
        'is_voided': is_voided,
        'order': {'id': 55555, 'merchant_order_id': str(order_pk)},
        'owner': 4321,
        'pending': False,
        'source_data': {'pan': '2346', 'sub_type': 'Visa', 'type': 'card'},
        'success': success,
    }


def sign_payload(obj, secret=TEST_HMAC_SECRET):
    """Recomputes the HMAC exactly the way Paymob would, for building a
    valid test webhook call — mirrors payments/paymob.py's own logic."""
    def get(dotted_key):
        value = obj
        for part in dotted_key.split('.'):
            value = value.get(part, '') if isinstance(value, dict) else ''
        return value

    concatenated = ''.join(str(get(field)) if get(field) is not None else '' for field in HMAC_FIELD_ORDER)
    return hmac_lib.new(secret.encode(), concatenated.encode(), hashlib.sha512).hexdigest()


@override_settings(PAYMOB_HMAC_SECRET=TEST_HMAC_SECRET, PAYMOB_INTEGRATION_ID='12345', PAYMOB_IFRAME_ID='1')
class CheckoutViewTests(APITestCase):
    def setUp(self):
        cache.clear()  # ScopedRateThrottle's cache persists across test methods otherwise
        self.student = make_user('alice')
        self.paid_course = Course.objects.create(title='Advanced English', price=300)
        self.free_course = Course.objects.create(title='Free Intro', price=0)
        self.client.force_authenticate(self.student)

    @patch('payments.views.paymob.start_checkout')
    def test_checkout_creates_pending_order_and_returns_iframe_url(self, mock_start_checkout):
        mock_start_checkout.return_value = ('paymob-order-1', 'https://accept.paymob.com/fake-iframe')

        response = self.client.post('/api/payments/checkout/', {'course_id': self.paid_course.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['iframe_url'], 'https://accept.paymob.com/fake-iframe')
        order = PurchaseOrder.objects.get(id=response.data['purchase_order_id'])
        self.assertEqual(order.status, PurchaseOrder.Status.PENDING)
        self.assertEqual(order.amount_cents, 30000)
        # No enrollment yet — checkout alone must never grant access
        self.assertFalse(Enrollment.objects.filter(student=self.student, course=self.paid_course).exists())

    def test_checkout_rejects_free_courses(self):
        response = self.client.post('/api/payments/checkout/', {'course_id': self.free_course.id})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(PurchaseOrder.objects.count(), 0)

    def test_checkout_rejects_already_enrolled_student(self):
        Enrollment.objects.create(student=self.student, course=self.paid_course, source=Enrollment.Source.ADMIN)
        response = self.client.post('/api/payments/checkout/', {'course_id': self.paid_course.id})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('payments.views.paymob.start_checkout')
    def test_reopening_checkout_clears_previous_pending_order(self, mock_start_checkout):
        mock_start_checkout.return_value = ('paymob-order-1', 'https://accept.paymob.com/fake-iframe')
        self.client.post('/api/payments/checkout/', {'course_id': self.paid_course.id})
        self.assertEqual(PurchaseOrder.objects.filter(status=PurchaseOrder.Status.PENDING).count(), 1)

        mock_start_checkout.return_value = ('paymob-order-2', 'https://accept.paymob.com/fake-iframe-2')
        self.client.post('/api/payments/checkout/', {'course_id': self.paid_course.id})
        self.assertEqual(PurchaseOrder.objects.filter(status=PurchaseOrder.Status.PENDING).count(), 1)

    @patch('payments.views.paymob.start_checkout', side_effect=Exception('Paymob is down'))
    def test_checkout_marks_order_failed_if_paymob_call_errors(self, mock_start_checkout):
        response = self.client.post('/api/payments/checkout/', {'course_id': self.paid_course.id})
        self.assertEqual(response.status_code, 502)
        order = PurchaseOrder.objects.get(student=self.student, course=self.paid_course)
        self.assertEqual(order.status, PurchaseOrder.Status.FAILED)

    def test_unauthenticated_request_is_rejected(self):
        self.client.force_authenticate(None)
        response = self.client.post('/api/payments/checkout/', {'course_id': self.paid_course.id})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


@override_settings(PAYMOB_HMAC_SECRET=TEST_HMAC_SECRET)
class WebhookTests(APITestCase):
    def setUp(self):
        self.student = make_user('alice')
        self.course = Course.objects.create(title='Advanced English', price=300)
        self.order = PurchaseOrder.objects.create(student=self.student, course=self.course, amount_cents=30000)

    def post_webhook(self, obj, hmac_value):
        return self.client.post(f'/api/payments/webhook/?hmac={hmac_value}', {'obj': obj}, format='json')

    def test_webhook_rejects_missing_hmac(self):
        obj = build_transaction_obj(order_pk=self.order.id)
        response = self.post_webhook(obj, '')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, PurchaseOrder.Status.PENDING)

    def test_webhook_rejects_forged_hmac(self):
        obj = build_transaction_obj(order_pk=self.order.id)
        response = self.post_webhook(obj, 'a' * 128)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Enrollment.objects.filter(student=self.student, course=self.course).exists())

    def test_webhook_rejects_hmac_computed_with_wrong_secret(self):
        """The exact failure mode of using a stale/wrong HMAC secret —
        payload is well-formed, but signed with the wrong key."""
        obj = build_transaction_obj(order_pk=self.order.id)
        wrong_hmac = sign_payload(obj, secret='not-the-real-secret')
        response = self.post_webhook(obj, wrong_hmac)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_valid_webhook_marks_order_paid_and_creates_enrollment(self):
        obj = build_transaction_obj(order_pk=self.order.id, success=True)
        valid_hmac = sign_payload(obj)

        response = self.post_webhook(obj, valid_hmac)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, PurchaseOrder.Status.PAID)
        self.assertIsNotNone(self.order.paid_at)

        enrollment = Enrollment.objects.get(student=self.student, course=self.course)
        self.assertEqual(enrollment.source, Enrollment.Source.PURCHASE)

    def test_failed_transaction_does_not_create_enrollment(self):
        obj = build_transaction_obj(order_pk=self.order.id, success=False)
        valid_hmac = sign_payload(obj)

        response = self.post_webhook(obj, valid_hmac)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, PurchaseOrder.Status.FAILED)
        self.assertFalse(Enrollment.objects.filter(student=self.student, course=self.course).exists())

    def test_voided_transaction_does_not_enroll_even_if_success_flag_is_true(self):
        """Paymob can mark success=True on a since-voided transaction —
        is_voided must independently block enrollment."""
        obj = build_transaction_obj(order_pk=self.order.id, success=True, is_voided=True)
        valid_hmac = sign_payload(obj)

        self.post_webhook(obj, valid_hmac)

        self.order.refresh_from_db()
        self.assertEqual(self.order.status, PurchaseOrder.Status.FAILED)
        self.assertFalse(Enrollment.objects.filter(student=self.student, course=self.course).exists())

    def test_webhook_for_unknown_order_returns_404_without_crashing(self):
        obj = build_transaction_obj(order_pk=999999)
        valid_hmac = sign_payload(obj)
        response = self.post_webhook(obj, valid_hmac)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_webhook_is_idempotent_if_paymob_retries_delivery(self):
        """Paymob may call the webhook more than once for the same
        transaction — a retry must not create a second enrollment."""
        obj = build_transaction_obj(order_pk=self.order.id, success=True)
        valid_hmac = sign_payload(obj)

        self.post_webhook(obj, valid_hmac)
        self.post_webhook(obj, valid_hmac)

        self.assertEqual(Enrollment.objects.filter(student=self.student, course=self.course).count(), 1)
