from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.profiles.models import Profile
from apps.users.models import User
from apps.workshops.models import Workshop


class StatsView(APIView):
    """Публичная статистика для главной — реальные счётчики из БД."""
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        cities = set()
        cities.update(c for c in User.objects.exclude(city="").values_list("city", flat=True) if c)
        cities.update(c for c in Workshop.objects.exclude(city="").values_list("city", flat=True) if c)

        return Response({
            "cosplayers": Profile.objects.filter(roles__contains=["cosplayer"]).count(),
            "photographers": Profile.objects.filter(roles__contains=["photographer"]).count(),
            "shops": Profile.objects.filter(roles__contains=["shop"]).count(),
            "workshops": Workshop.objects.count(),
            "cities": len(cities),
        })
