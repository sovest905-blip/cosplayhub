from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import OrderViewSet, IncomingOrdersView, OrderReviewView

router = DefaultRouter()
router.register("orders", OrderViewSet, basename="order")

# ВАЖНО: incoming-пути идут ПЕРЕД router.urls. Иначе detail-роут роутера
# `orders/<pk>/` (pk = [^/.]+) перехватывает `orders/incoming/` как pk="incoming"
# → GET списка входящих заказов отдавал 404 (поймано тестом test_owner_sees_incoming_orders).
urlpatterns = [
    path("orders/incoming/", IncomingOrdersView.as_view(), name="orders-incoming"),
    path("orders/incoming/<int:pk>/", IncomingOrdersView.as_view(), name="orders-incoming-update"),
    path("orders/<int:pk>/review/", OrderReviewView.as_view(), name="order-review"),
] + router.urls
