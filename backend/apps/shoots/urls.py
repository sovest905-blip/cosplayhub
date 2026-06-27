from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import MyShootsView, ShootViewSet

router = DefaultRouter()
router.register("shoots", ShootViewSet, basename="shoot")

# Явный путь ПЕРЕД router.urls (грабля orders/bookings: detail-pk матчит словесные сегменты)
urlpatterns = [
    path("shoots/mine/", MyShootsView.as_view(), name="shoots-mine"),
] + router.urls
