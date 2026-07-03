from django.urls import path
from .views import (
    MySubscriptionsView, ActivateView, CreatePaymentView,
    NowPaymentsWebhookView, CryptomusWebhookView,
)

urlpatterns = [
    path("billing/me/", MySubscriptionsView.as_view(), name="billing-me"),
    path("billing/activate/", ActivateView.as_view(), name="billing-activate"),
    path("billing/pay/", CreatePaymentView.as_view(), name="billing-pay"),
    path("billing/nowpayments/webhook/", NowPaymentsWebhookView.as_view(), name="billing-nowpayments-webhook"),
    path("billing/cryptomus/webhook/", CryptomusWebhookView.as_view(), name="billing-cryptomus-webhook"),
]
