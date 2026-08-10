from django.urls import path
from .views import CheckoutView, PaymobWebhookView, MyPurchasesView, PurchaseStatusView

urlpatterns = [
    path('checkout/', CheckoutView.as_view(), name='payments-checkout'),
    path('webhook/', PaymobWebhookView.as_view(), name='payments-webhook'),
    path('me/', MyPurchasesView.as_view(), name='payments-me'),
    path('<int:pk>/', PurchaseStatusView.as_view(), name='payments-status'),
]
