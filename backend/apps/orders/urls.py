from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import OrderViewSet, IncomingOrdersView

router = DefaultRouter()
router.register("orders", OrderViewSet, basename="order")

urlpatterns = router.urls + [
    path("orders/incoming/", IncomingOrdersView.as_view(), name="orders-incoming"),
    path("orders/incoming/<int:pk>/", IncomingOrdersView.as_view(), name="orders-incoming-update"),
]
