"""Персональная лента (GET /feed/). Агрегирует свежий контент под интересы юзера и
ранжирует по совокупному скору: релевантность (подписка/фандом/город) + популярность
(лайки/идущие) + свежесть (затухание по возрасту). Плюс разнообразие авторов в выдаче.
Без отдельной модели — собираем на лету. Масштаб беты мал."""
from django.db.models import Count
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.backends import CsrfExemptSessionAuthentication
from apps.events.models import Event
from apps.looks.models import Look
from apps.news.models import News
from apps.profiles.models import Follow

# Веса релевантности (база) — почему элемент вообще попал в ленту.
W_FOLLOW = 40       # образ того, на кого подписан
W_FANDOM = 25       # образ по моим фандомам
W_FRESH = 3         # фолбэк-наполнение свежими образами
W_EVENT_CITY = 30   # событие в моём городе
W_EVENT = 12        # любое ближайшее событие
W_NEWS_PIN = 18     # закреплённая новость
W_NEWS = 8          # обычная новость
W_BOOST = 35        # образ, продвигаемый автором (Pro 1.5)
MAX_LOOKS_PER_AUTHOR = 5  # разнообразие: не даём одному автору забить ленту


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
    """Персональная лента. {items:[{type,id,title,subtitle,image,url,reason,created_at}], personalized}."""
    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def get(self, request):
        user = request.user
        profile = getattr(user, "profile", None)
        city = (user.city or "").strip().lower()
        fandoms = _fandom_tokens(profile)
        following_ids = set(Follow.objects.filter(follower=user).values_list("target_id", flat=True))
        now = timezone.now()
        today = timezone.localdate()

        items = []
        seen_looks = set()

        def recency(dt, half=0.4, cap=12):
            """Свежесть: новое = +cap, линейно затухает (через ~cap/half дней до 0)."""
            age = max(0, (now - dt).days)
            return max(0.0, cap - half * age)

        def add_look(look, reason, base):
            if look.id in seen_looks:
                return
            seen_looks.add(look.id)
            pop = min(getattr(look, "nlikes", 0), 25)             # до +25 за лайки
            city_aff = 6 if (city and look.author and (look.author.city or "").strip().lower() == city) else 0
            score = base + pop + recency(look.created_at) + city_aff
            items.append({
                "type": "look", "id": look.id, "title": look.title,
                "subtitle": look.character or "",
                "image": look.image.url if look.image else None,
                "url": "/looks", "author": look.author.username if look.author else "",
                "reason": reason, "score": score, "created_at": look.created_at,
            })

        published_looks = list(Look.objects.filter(is_published=True)
                               .select_related("author").annotate(nlikes=Count("likes"))
                               .order_by("-created_at")[:120])

        # 1. Образы тех, на кого подписан
        for lk in published_looks:
            if lk.author_id and lk.author_id in following_ids:
                add_look(lk, f"Вы подписаны на @{lk.author.username}", W_FOLLOW)

        # 1b. Продвигаемые образы (Pro-буст) — подмешиваем в ленту всем.
        for lk in published_looks:
            if lk.boosted_until and lk.boosted_until > now:
                add_look(lk, "Продвигается автором", W_BOOST)

        # 2. Образы по фандомам/персонажам из интересов
        if fandoms:
            for lk in published_looks:
                hay = f"{lk.character} {lk.title}".lower()
                hit = next((f for f in fandoms if f and f in hay), None)
                if hit:
                    add_look(lk, f"По вашему интересу: {hit}", W_FANDOM)

        # 3. Ближайшие события (свой город — приоритетнее, чем ближе дата — тем выше)
        for ev in Event.objects.filter(is_published=True, date__gte=today).order_by("date")[:20]:
            same_city = city and (ev.city or "").strip().lower() == city
            days_until = max(0, (ev.date - today).days)
            closeness = max(0.0, 12 - 0.3 * days_until)
            pop = min((ev.going or 0) // 2, 10)
            items.append({
                "type": "event", "id": ev.id, "title": ev.title,
                "subtitle": f"{ev.city} · {ev.date:%d.%m}" if ev.city else f"{ev.date:%d.%m}",
                "image": ev.cover.url if ev.cover else None, "url": "/events",
                "reason": f"Событие в г. {ev.city}" if same_city else "Ближайшее событие",
                "score": (W_EVENT_CITY if same_city else W_EVENT) + closeness + pop,
                "created_at": ev.created_at,
            })

        # 4. Новости платформы (фон)
        for nw in News.objects.filter(is_published=True).order_by("-is_pinned", "-created_at")[:5]:
            items.append({
                "type": "news", "id": nw.id, "title": nw.title, "subtitle": "",
                "image": nw.image.url if nw.image else None, "url": "/news",
                "reason": "Новости платформы",
                "score": (W_NEWS_PIN if nw.is_pinned else W_NEWS) + recency(nw.created_at, half=0.5, cap=10),
                "created_at": nw.created_at,
            })

        personalized = bool(following_ids or fandoms)

        # 5. Фолбэк: если персональных образов мало — добиваем свежими/популярными общими
        if len([i for i in items if i["type"] == "look"]) < 6:
            for lk in published_looks[:14]:
                add_look(lk, "Свежий образ", W_FRESH)

        # Ранжируем по скору; свежесть — вторичный ключ.
        items.sort(key=lambda i: (i["score"], i["created_at"]), reverse=True)

        # Разнообразие: не больше MAX_LOOKS_PER_AUTHOR образов одного автора в выдаче.
        final, per_author = [], {}
        for it in items:
            if it["type"] == "look" and it.get("author"):
                c = per_author.get(it["author"], 0)
                if c >= MAX_LOOKS_PER_AUTHOR:
                    continue
                per_author[it["author"]] = c + 1
            it.pop("score", None)
            final.append(it)

        return Response({"personalized": personalized, "items": final[:40]})
