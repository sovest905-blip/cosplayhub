from django.urls import path
from .views import (
    MySubscriptionsView, ActivateView, CreatePaymentView, CryptomusWebhookView,
)

urlpatterns = [
    path("billing/me/", MySubscriptionsView.as_view(), name="billing-me"),
    path("billing/activate/", ActivateView.as_view(), name="billing-activate"),
    path("billing/pay/", CreatePaymentView.as_view(), name="billing-pay"),
    path("billing/cryptomus/webhook/", CryptomusWebhookView.as_view(), name="billing-cryptomus-webhook"),
]
