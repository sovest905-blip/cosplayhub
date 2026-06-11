from django.db.models import Q
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.events.models import Event
from apps.guides.models import Guide
from apps.listings.models import Listing
from apps.looks.models import Look
from apps.profiles.models import Profile
from apps.teams.models import Team
from apps.users.models import User
from apps.workshops.models import Workshop


class StatsView(APIView):
    """Публичная статистика для главной и навигации — реальные счётчики из БД."""
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
            # — главная (hero) —
            "cosplayers": members,
            "photographers": Profile.objects.filter(roles__contains=["photographer"]).count(),
            "shops": Profile.objects.filter(roles__contains=["shop"]).count(),
            "workshops": Workshop.objects.count(),
            "cities": len(cities),
            # — навигация (выпадающие меню), всё из реальной БД —
            "cosplayer_profiles": Profile.objects.filter(roles__contains=["cosplayer"]).count(),
            "looks": Look.objects.filter(is_published=True).count(),
            "teams": Team.objects.filter(is_active=True).count(),
            "locations": Profile.objects.filter(roles__contains=["location"]).count(),
            "jobs": Listing.objects.filter(is_active=True, type__in=["job", "collab"]).count(),
            "market": Listing.objects.filter(is_active=True, type__in=["sell", "buy"]).count(),
            "events": Event.objects.filter(is_published=True, date__gte=timezone.now().date()).count(),
            "guides": Guide.objects.filter(is_published=True).count(),
        })


# ── Умный поиск ───────────────────────────────────────────────────────────────

# Русские слова → slug роли (для профилей). Если запрос содержит такое слово —
# дополнительно ищем профили с этой ролью.
ROLE_KEYWORDS = {
    "косплеер": "cosplayer", "косплей": "cosplayer", "cosplay": "cosplayer",
    "фотограф": "photographer", "фото": "photographer", "photo": "photographer",
    "мастерская": "workshop", "мастер": "workshop",
    "магазин": "shop", "шоп": "shop", "shop": "shop",
    "локация": "location", "студия": "location", "локаци": "location",
    "фанат": "fan",
}
# Русские слова → тип мастерской.
WS_TYPE_KEYWORDS = {
    "3d": "print3d", "3д": "print3d", "печать": "print3d", "принт": "print3d", "print": "print3d",
    "eva": "eva", "эва": "eva", "броня": "eva", "пена": "eva",
    "пошив": "sewing", "шить": "sewing", "швея": "sewing", "костюм": "sewing", "ткан": "sewing",
    "парик": "wigs", "волос": "wigs", "wig": "wigs",
}
# Разделы сайта для быстрого перехода ("куда пойти").
SECTIONS = [
    {"label": "Косплееры", "url": "/people", "keys": ["косплеер", "косплей", "люди", "анкет"]},
    {"label": "Фотографы", "url": "/photographers", "keys": ["фотограф", "фото", "съёмк", "съемк"]},
    {"label": "Мастерские", "url": "/workshops", "keys": ["мастерск", "мастер", "печать", "пошив", "парик", "броня"]},
    {"label": "Магазины", "url": "/shops", "keys": ["магазин", "шоп", "купить", "товар"]},
    {"label": "Локации", "url": "/locations", "keys": ["локаци", "студи", "съёмочн", "площадк"]},
    {"label": "События", "url": "/events", "keys": ["событи", "фест", "сходк", "конвент"]},
    {"label": "Гайды", "url": "/guides", "keys": ["гайд", "урок", "туториал", "как"]},
    {"label": "Барахолка", "url": "/market", "keys": ["барахолк", "продать", "купить", "объявлен"]},
    {"label": "Pro-тарифы", "url": "/pro", "keys": ["pro", "про", "тариф", "подписк", "premium"]},
]


class SearchView(APIView):
    """Умный глобальный поиск: профили + мастерские + объявления + разделы.
    Ищет по многим полям, понимает русские слова-категории, ранжирует по релевантности.
    ?q=строка"""
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        q = (request.query_params.get("q") or "").strip()
        if len(q) < 2:
            return Response({"q": q, "profiles": [], "workshops": [], "listings": [], "sections": []})

        ql = q.lower()
        words = [w for w in ql.split() if w]

        # Какие роли/типы подразумевает запрос
        wanted_roles = {slug for kw, slug in ROLE_KEYWORDS.items() if kw in ql}
        wanted_types = {slug for kw, slug in WS_TYPE_KEYWORDS.items() if kw in ql}

        profiles = self._search_profiles(q, ql, wanted_roles)
        workshops = self._search_workshops(q, ql, wanted_types)
        listings = self._search_listings(q, ql)
        sections = self._match_sections(ql, words)

        return Response({
            "q": q,
            "sections": sections,
            "profiles": profiles,
            "workshops": workshops,
            "listings": listings,
        })

    # ── профили ──
    def _search_profiles(self, q, ql, wanted_roles):
        cond = (
            Q(display_name__icontains=q) | Q(user__username__icontains=q)
            | Q(bio__icontains=q) | Q(user__city__icontains=q)
            | Q(experience__icontains=q)
        )
        for slug in wanted_roles:
            cond |= Q(roles__contains=[slug])
        qs = Profile.objects.select_related("user").filter(cond).distinct()[:40]

        def score(p):
            s = 0
            name = (p.display_name or (p.user.username if p.user else "")).lower()
            city = (p.user.city if p.user else "").lower()
            if name == ql: s += 100
            if name.startswith(ql): s += 50
            if ql in name: s += 30
            if any(r in wanted_roles for r in (p.roles or [])): s += 25
            if ql and ql in city: s += 15
            if p.bio and ql in p.bio.lower(): s += 5
            if p.user and p.user.is_pro: s += 4   # Pro-приоритет в поиске (как у мастерских)
            if p.avatar: s += 3
            return s

        ranked = sorted(qs, key=score, reverse=True)[:12]
        return [
            {
                "id": p.id,
                "display_name": p.display_name or (p.user.username if p.user else ""),
                "city": p.user.city if p.user else "",
                "roles": p.roles,
                "avatar": p.avatar.url if p.avatar else None,
            }
            for p in ranked
        ]

    # ── мастерские ──
    def _search_workshops(self, q, ql, wanted_types):
        cond = Q(name__icontains=q) | Q(city__icontains=q) | Q(about__icontains=q)
        for slug in wanted_types:
            cond |= Q(type=slug)
        qs = Workshop.objects.filter(cond).distinct()[:40]

        def score(w):
            s = 0
            name = (w.name or "").lower()
            if name == ql: s += 100
            if name.startswith(ql): s += 50
            if ql in name: s += 30
            if w.type in wanted_types: s += 25
            if ql in (w.city or "").lower(): s += 15
            if w.about and ql in w.about.lower(): s += 5
            if w.is_pro: s += 4
            if w.cover: s += 3
            return s

        ranked = sorted(qs, key=score, reverse=True)[:12]
        return [
            {"id": w.id, "name": w.name, "type": w.type, "city": w.city,
             "cover": w.cover.url if w.cover else None}
            for w in ranked
        ]

    # ── объявления (только активные) ──
    def _search_listings(self, q, ql):
        qs = (
            Listing.objects.filter(is_active=True)
            .filter(Q(title__icontains=q) | Q(description__icontains=q) | Q(city__icontains=q))
            .select_related("user")[:12]
        )
        return [
            {"id": l.id, "title": l.title, "type": l.type, "city": l.city,
             "price": l.price, "owner": l.user.username if l.user else ""}
            for l in qs
        ]

    # ── разделы сайта ──
    def _match_sections(self, ql, words):
        out = []
        for sec in SECTIONS:
            if any(any(w.startswith(k) or k.startswith(w) for k in sec["keys"]) for w in words) \
               or any(k in ql for k in sec["keys"]):
                out.append({"label": sec["label"], "url": sec["url"]})
        return out[:5]


# ── Аналитика (льгота Pro: «расширенная аналитика профиля» / «бизнес-аналитика») ──

from rest_framework.permissions import IsAuthenticated
from apps.users.backends import CsrfExemptSessionAuthentication


class AnalyticsMeView(APIView):
    """Аналитика текущего пользователя. Доступна только при активном Pro
    (профильном ИЛИ хотя бы одной Pro-мастерской) — иначе {pro: false} (апселл).
    Все цифры из существующих данных; «просмотры профиля» пока не трекаются."""
    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def get(self, request):
        from apps.looks.models import Look, LookLike
        from apps.orders.models import Order, Review
        from apps.products.models import Product
        from apps.profiles.models import Follow
        from apps.workshops.models import Workshop

        user = request.user
        workshops = list(Workshop.objects.filter(owner=user))
        has_ws_pro = any(w.is_pro for w in workshops)
        pro = bool(user.is_pro or has_ws_pro)
        if not pro:
            return Response({"pro": False})

        # ── Профиль ──
        my_looks = Look.objects.filter(author=user)
        look_ids = list(my_looks.values_list("id", flat=True))
        profile = {
            "followers": Follow.objects.filter(target=user).count(),
            "following": Follow.objects.filter(follower=user).count(),
            "looks": my_looks.filter(is_published=True).count(),
            "look_likes": LookLike.objects.filter(look_id__in=look_ids).count(),
        }

        # ── Бизнес (если есть мастерские) ──
        business = None
        if workshops:
            ws_ids = [w.id for w in workshops]
            orders = Order.objects.filter(workshop_id__in=ws_ids)
            by_status = {key: 0 for key, _ in Order.STATUS}
            for st in orders.values_list("status", flat=True):
                by_status[st] = by_status.get(st, 0) + 1
            reviews = Review.objects.filter(workshop_id__in=ws_ids)
            ratings = list(reviews.values_list("rating", flat=True))
            business = {
                "workshops": len(workshops),
                "orders_total": orders.count(),
                "orders_by_status": by_status,
                "reviews": len(ratings),
                "rating_avg": round(sum(ratings) / len(ratings), 1) if ratings else 0,
                "products": Product.objects.filter(owner=user).count(),
            }

        return Response({"pro": True, "profile": profile, "business": business})
