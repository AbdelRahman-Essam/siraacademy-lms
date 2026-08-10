from django.conf import settings
from django.db import models
from courses.models import Course


class PurchaseOrder(models.Model):
    """
    One row per checkout attempt. Created as 'pending' when the student
    clicks Purchase; flipped to 'paid' (which also creates the
    Enrollment with source='purchase') or 'failed' by the Paymob
    webhook once the transaction actually completes. Never trust the
    frontend to mark this paid — only PaymobWebhookView does that,
    after verifying Paymob's HMAC signature.
    """

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        PAID = 'paid', 'Paid'
        FAILED = 'failed', 'Failed'

    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='purchase_orders')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='purchase_orders')
    amount_cents = models.PositiveIntegerField(help_text="Course price in piasters (EGP price * 100)")
    currency = models.CharField(max_length=3, default='EGP')
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)

    paymob_order_id = models.CharField(max_length=64, blank=True)
    paymob_transaction_id = models.CharField(max_length=64, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.student} — {self.course} — {self.status} ({self.amount_cents / 100} {self.currency})"
