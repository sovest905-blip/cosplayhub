import hashlib
import re

from django.conf import settings
from django.db import IntegrityError
from django.db.models import F
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import DailyVisit, VisitorDay

# Простая эвристика ботов/краулеров по User-Agent — таких не считаем.
_BOT_RE = re.compile(
    r"bot|crawl|spider|slurp|scrape|curl|wget|python-requests|httpclient|"
    r"headless|phantom|monitor|uptime|facebookexternalhit|preview|lighthouse",
    re.IGNORECASE,
)


def _client_ip(request) -> str:
    """Реальный IP клиента с учётом того, что мы за nginx (X-Forwarded-For)."""
    xff = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "") or ""


class TrackVisitView(APIView):
    """POST — засчитать посещение сайта за сегодня.

    Открыто всем, без CSRF. Боты игнорируются; один посетитель (IP) за день
    считается один раз. Ничего не возвращает — числа видны только в админке."""
    authentication_classes = []  # без сессии → DRF не требует CSRF
    permission_classes = [AllowAny]

    def post(self, request):
        ua = request.META.get("HTTP_USER_AGENT", "")
        if not ua or _BOT_RE.search(ua):
            return Response(status=204)  # бот/пустой UA — не считаем

        ip = _client_ip(request)
        if not ip:
            return Response(status=204)

        today = timezone.localdate()
        # Соленый хэш IP — сырой адрес не храним (ПДн).
        ip_hash = hashlib.sha256(f"{settings.SECRET_KEY}:{ip}".encode()).hexdigest()

        try:
            VisitorDay.objects.create(date=today, ip_hash=ip_hash)
        except IntegrityError:
            return Response(status=204)  # уже был сегодня — не двоим

        obj, _ = DailyVisit.objects.get_or_create(date=today)
        DailyVisit.objects.filter(pk=obj.pk).update(count=F("count") + 1)
        return Response(status=204)
