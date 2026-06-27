from rest_framework.routers import DefaultRouter

from .views import BattleViewSet

router = DefaultRouter()
router.register("battles", BattleViewSet, basename="battle")

urlpatterns = router.urls
