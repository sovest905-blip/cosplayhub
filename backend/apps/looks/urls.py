from rest_framework.routers import DefaultRouter
from .views import LookViewSet

router = DefaultRouter()
router.register("looks", LookViewSet, basename="look")

urlpatterns = router.urls
