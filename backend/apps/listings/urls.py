from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import ListingViewSet, PublicListingsView

router = DefaultRouter()
router.register("listings", ListingViewSet, basename="listing")
urlpatterns = [
    path("listings/public/", PublicListingsView.as_view(), name="listings-public"),
] + router.urls
