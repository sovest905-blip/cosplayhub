from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import BookingStatusView, MyBookingsView, SlotViewSet

router = DefaultRouter()
router.register("slots", SlotViewSet, basename="slot")

# Явные пути ПЕРЕД router.urls (грабля orders: detail-pk роутера матчит словесные сегменты)
urlpatterns = [
    path("bookings/mine/", MyBookingsView.as_view(), name="bookings-mine"),
    path("bookings/<int:pk>/", BookingStatusView.as_view(), name="booking-status"),
] + router.urls
