from rest_framework.routers import DefaultRouter
from .views import MoodboardViewSet

router = DefaultRouter()
router.register("moodboards", MoodboardViewSet, basename="moodboard")

urlpatterns = router.urls
