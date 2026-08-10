from rest_framework import serializers
from .models import PurchaseOrder


class PurchaseOrderSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source='course.title', read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = ['id', 'course', 'course_title', 'amount_cents', 'currency', 'status', 'created_at', 'paid_at']
        read_only_fields = fields
