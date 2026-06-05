from django.db.models import Q
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

        # «Косплееров» = все зарегистрированные участники (без служебных аккаунтов).
        # Роли (фотограф/магазин) считаем по профилям — появятся, когда юзеры их заполнят.
        members = User.objects.filter(is_superuser=False, is_active=True).count()

        return Response({
            "cosplayers": members,
            "photographers": Profile.objects.filter(roles__contains=["photographer"]).count(),
            "shops": Profile.objects.filter(roles__contains=["shop"]).count(),
            "workshops": Workshop.objects.count(),
            "cities": len(cities),
        })


class SearchView(APIView):
    """Глобальный поиск по профилям и мастерским. ?q=строка."""
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        q = (request.query_params.get("q") or "").strip()
        if len(q) < 2:
            return Response({"profiles": [], "workshops": [], "q": q})

        profiles = (
            Profile.objects.select_related("user")
            .filter(Q(display_name__icontains=q) | Q(user__username__icontains=q))[:12]
        )
        workshops = (
            Workshop.objects
            .filter(Q(name__icontains=q) | Q(city__icontains=q))[:12]
        )

        return Response({
            "q": q,
            "profiles": [
                {
                    "id": p.id,
                    "display_name": p.display_name or (p.user.username if p.user else ""),
                    "city": p.user.city if p.user else "",
                    "roles": p.roles,
                    "avatar": p.avatar.url if p.avatar else None,
                }
                for p in profiles
            ],
            "workshops": [
                {
                    "id": w.id,
                    "name": w.name,
                    "type": w.type,
                    "city": w.city,
                    "cover": w.cover.url if w.cover else None,
                }
                for w in workshops
            ],
        })
