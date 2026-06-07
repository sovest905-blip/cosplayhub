from rest_framework.routers import DefaultRouter
from .views import GuideViewSet

router = DefaultRouter()
router.register("guides", GuideViewSet, basename="guide")

urlpatterns = router.urls
