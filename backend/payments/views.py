import logging

from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from courses.models import Course
from enrollments.models import Enrollment
from . import paymob
from .models import PurchaseOrder
from .serializers import PurchaseOrderSerializer

logger = logging.getLogger(__name__)


class CheckoutView(APIView):
    """
    POST /api/payments/checkout/  { "course_id": 1 }
    Starts a Paymob checkout: creates a pending PurchaseOrder, registers
    an order + payment key with Paymob, and returns the iframe URL for
    the frontend to redirect the student to. The Enrollment itself is
    only created once the webhook confirms payment — never here.
    """
    permission_classes = [permissions.IsAuthenticated]
    throttle_scope = 'checkout'

    def post(self, request):
        course = Course.objects.filter(id=request.data.get('course_id')).first()
        if not course:
            return Response({'detail': 'Course not found.'}, status=status.HTTP_404_NOT_FOUND)

        if Enrollment.objects.filter(student=request.user, course=course).exists():
            return Response({'detail': 'Already enrolled.'}, status=status.HTTP_400_BAD_REQUEST)

        if course.price <= 0:
            return Response(
                {'detail': 'This course is free — use the self-enroll endpoint instead.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Clean up any earlier abandoned attempts (e.g. student opened
        # checkout, closed the tab, came back and clicked Purchase again)
        # so pending orders don't pile up indefinitely.
        PurchaseOrder.objects.filter(
            student=request.user, course=course, status=PurchaseOrder.Status.PENDING,
        ).delete()

        amount_cents = int(course.final_price * 100)
        order = PurchaseOrder.objects.create(
            student=request.user, course=course, amount_cents=amount_cents,
        )

        billing_data = {
            "first_name": request.user.first_name or request.user.username,
            "last_name": request.user.last_name or "N/A",
            "email": request.user.email or "no-email@example.com",
            "phone_number": "+20000000000",
            "apartment": "NA", "floor": "NA", "street": "NA", "building": "NA",
            "city": "NA", "country": "EG", "state": "NA",
        }

        try:
            paymob_order_id, iframe_url = paymob.start_checkout(
                amount_cents=amount_cents,
                merchant_order_id=order.id,
                billing_data=billing_data,
            )
        except Exception:
            logger.exception("Paymob checkout failed for order %s", order.id)
            order.status = PurchaseOrder.Status.FAILED
            order.save(update_fields=['status'])
            return Response({'detail': 'Could not start payment. Please try again.'}, status=502)

        order.paymob_order_id = paymob_order_id
        order.save(update_fields=['paymob_order_id'])

        return Response({'purchase_order_id': order.id, 'iframe_url': iframe_url})


class PaymobWebhookView(APIView):
    """
    POST /api/payments/webhook/
    Paymob's "Transaction Processed Callback" — configure this URL in
    your Paymob dashboard's integration settings. Verifies the HMAC
    before trusting anything in the payload. On a successful, non-void,
    non-refunded transaction, marks the matching PurchaseOrder paid and
    creates the Enrollment with source='purchase'.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        payload = request.data
        obj = payload.get('obj', payload)
        received_hmac = request.query_params.get('hmac', '')

        if not paymob.verify_hmac(obj, received_hmac):
            logger.warning("Paymob webhook HMAC verification failed")
            return Response({'detail': 'Invalid signature.'}, status=status.HTTP_400_BAD_REQUEST)

        merchant_order_id = (obj.get('order') or {}).get('merchant_order_id')
        order = PurchaseOrder.objects.filter(id=merchant_order_id).first()
        if not order:
            logger.warning("Paymob webhook: no matching PurchaseOrder for merchant_order_id=%s", merchant_order_id)
            return Response({'detail': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        order.paymob_transaction_id = str(obj.get('id', ''))

        is_success = obj.get('success') and not obj.get('is_voided') and not obj.get('is_refunded')

        if is_success:
            order.status = PurchaseOrder.Status.PAID
            order.paid_at = timezone.now()
            order.save(update_fields=['status', 'paid_at', 'paymob_transaction_id'])

            Enrollment.objects.get_or_create(
                student=order.student, course=order.course,
                defaults={'source': Enrollment.Source.PURCHASE},
            )
        else:
            order.status = PurchaseOrder.Status.FAILED
            order.save(update_fields=['status', 'paymob_transaction_id'])

        return Response({'detail': 'ok'})


class MyPurchasesView(generics.ListAPIView):
    """GET /api/payments/me/ — the logged-in student's purchase history."""
    serializer_class = PurchaseOrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PurchaseOrder.objects.filter(student=self.request.user).order_by('-created_at')


class PurchaseStatusView(generics.RetrieveAPIView):
    """
    GET /api/payments/<id>/
    Lets the frontend poll a specific purchase's status after returning
    from the Paymob iframe (the webhook may arrive slightly after the
    redirect).
    """
    serializer_class = PurchaseOrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PurchaseOrder.objects.filter(student=self.request.user)
