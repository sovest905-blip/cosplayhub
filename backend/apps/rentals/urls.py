from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import CostumeViewSet, MyRentalsView, RentalStatusView

router = DefaultRouter()
router.register("costumes", CostumeViewSet, basename="costume")

# Явные пути ПЕРЕД router.urls (грабля orders/bookings: detail-pk матчит словесные сегменты)
urlpatterns = [
    path("rentals/mine/", MyRentalsView.as_view(), name="rentals-mine"),
    path("rentals/<int:pk>/", RentalStatusView.as_view(), name="rental-status"),
] + router.urls
