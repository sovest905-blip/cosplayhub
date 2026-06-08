from django.urls import path
from .views import MySubscriptionsView, ActivateView

urlpatterns = [
    path("billing/me/", MySubscriptionsView.as_view(), name="billing-me"),
    path("billing/activate/", ActivateView.as_view(), name="billing-activate"),
]
