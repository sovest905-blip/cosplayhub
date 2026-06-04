from rest_framework.routers import DefaultRouter
from .views import WorkshopViewSet
router = DefaultRouter()
router.register("workshops", WorkshopViewSet, basename="workshop")
urlpatterns = router.urls
