"""Персональная лента (GET /feed/). Агрегирует свежий контент под интересы юзера:
образы тех, на кого подписан + образы по фандомам + ближайшие события (свой город
приоритетнее) + новости. Без отдельной модели — собираем на лету. Масштаб беты мал."""
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.backends import CsrfExemptSessionAuthentication
from apps.events.models import Event
from apps.looks.models import Look
from apps.news.models import News
from apps.profiles.models import Follow


def _fandom_tokens(profile) -> set:
    """Интересы юзера: фандомы из анкет косплеера и фаната (нормализованные токены)."""
    rd = (profile.role_details or {}) if profile else {}
    raw = []
    for role in ("cosplayer", "fan"):
        val = (rd.get(role) or {}).get("fandoms")
        if isinstance(val, str):
            raw += val.split(",")
        elif isinstance(val, (list, tuple)):
            raw += list(val)
    return {t.strip().lower() for t in raw if str(t).strip()}


class FeedView(APIView):
    """Персональная лента. Возвращает {items:[{type,id,title,image,url,reason,created_at}], personalized}."""
    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def get(self, request):
        user = request.user
        profile = getattr(user, "profile", None)
        city = (user.city or "").strip().lower()
        fandoms = _fandom_tokens(profile)
        following_ids = set(Follow.objects.filter(follower=user).values_list("target_id", flat=True))

        items = []
        seen_looks = set()

        def add_look(look, reason, boost):
            if look.id in seen_looks:
                return
            seen_looks.add(look.id)
            items.append({
                "type": "look", "id": look.id,
                "title": look.title,
                "subtitle": look.character or "",
                "image": look.image.url if look.image else None,
                "url": "/looks",
                "author": look.author.username if look.author else "",
                "reason": reason, "boost": boost,
                "created_at": look.created_at,
            })

        published_looks = (Look.objects.filter(is_published=True)
                           .select_related("author").order_by("-created_at")[:120])

        # 1. Образы тех, на кого подписан
        for lk in published_looks:
            if lk.author_id and lk.author_id in following_ids:
                add_look(lk, f"Вы подписаны на @{lk.author.username}", 30)

        # 2. Образы по фандомам/персонажам из интересов
        if fandoms:
            for lk in published_looks:
                hay = f"{lk.character} {lk.title}".lower()
                hit = next((f for f in fandoms if f and f in hay), None)
                if hit:
                    add_look(lk, f"По вашему интересу: {hit}", 20)

        # 3. Ближайшие события (свой город — приоритетнее)
        today = timezone.localdate()
        for ev in Event.objects.filter(is_published=True, date__gte=today).order_by("date")[:20]:
            same_city = city and (ev.city or "").strip().lower() == city
            items.append({
                "type": "event", "id": ev.id,
                "title": ev.title,
                "subtitle": f"{ev.city} · {ev.date:%d.%m}" if ev.city else f"{ev.date:%d.%m}",
                "image": ev.cover.url if ev.cover else None,
                "url": "/events",
                "reason": f"Событие в г. {ev.city}" if same_city else "Ближайшее событие",
                "boost": 25 if same_city else 10,
                "created_at": ev.created_at,
            })

        # 4. Новости платформы (фон)
        for nw in News.objects.filter(is_published=True).order_by("-is_pinned", "-created_at")[:5]:
            items.append({
                "type": "news", "id": nw.id,
                "title": nw.title,
                "subtitle": "",
                "image": nw.image.url if nw.image else None,
                "url": "/news",
                "reason": "Новости платформы",
                "boost": 15 if nw.is_pinned else 5,
                "created_at": nw.created_at,
            })

        # Персонализирована, если есть подписки или интересы; иначе — общая (но не пустая) лента.
        personalized = bool(following_ids or fandoms)

        # 5. Фолбэк: если персональных образов мало — добиваем свежими общими
        if len([i for i in items if i["type"] == "look"]) < 6:
            for lk in published_looks[:12]:
                add_look(lk, "Свежий образ", 1)

        items.sort(key=lambda i: (i["boost"], i["created_at"]), reverse=True)
        for i in items:
            i.pop("boost", None)

        return Response({"personalized": personalized, "items": items[:40]})
