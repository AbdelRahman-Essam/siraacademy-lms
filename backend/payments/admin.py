from django.contrib import admin
from .models import PurchaseOrder


@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = ['student', 'course', 'amount_cents', 'currency', 'status', 'created_at', 'paid_at']
    list_filter = ['status']
    readonly_fields = ['paymob_order_id', 'paymob_transaction_id', 'created_at', 'paid_at']
