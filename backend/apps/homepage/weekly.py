"""«Выбор недели по разделам» — автоподбор карточки-героя для каждого раздела.

Берём топ за последние 7 дней по метрике раздела (лайки/голоса/рейтинг),
с фолбэком на всё время, если за неделю пусто. Ручной оверрайд — через CuratedPick
(если админ завёл активные карточки, фронт показывает их вместо авто)."""
from datetime import timedelta

from django.db.models import Count, Q
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


def _img(field):
    try:
        return field.url if field else None
    except ValueError:
        return None


def _card(section, style, tag, obj, title, meta, image, link):
    return {
        "section": section, "style": style, "tag": tag,
        "title": title, "meta": meta, "image": image, "link": link,
    }


class WeeklyPicksView(APIView):
    """GET /api/v1/weekly-picks/ — по одной карточке-герою на раздел (автоподбор за 7 дней)."""
    permission_classes = [AllowAny]

    def get(self, request):
        week = timezone.now() - timedelta(days=7)
        picks = []

        # Образы — топ по лайкам за неделю (фолбэк: свежий опубликованный)
        try:
            from apps.looks.models import Look
            qs = Look.objects.filter(is_published=True)
            top = (qs.annotate(recent=Count("likes", filter=Q(likes__created_at__gte=week)))
                     .order_by("-recent", "-created_at").first())
            if top:
                picks.append(_card("looks", "look", "★ Образ недели", top, top.title,
                                   top.character or "Косплей-образ", _img(top.image), f"/looks/{top.id}"))
        except Exception:
            pass

        # Баттлы — топ по голосам за неделю (фолбэк: активный)
        try:
            from apps.battles.models import Battle
            qs = Battle.objects.filter(is_active=True)
            top = (qs.annotate(recent=Count("votes", filter=Q(votes__created_at__gte=week)))
                     .order_by("-recent", "-created_at").first())
            if top:
                picks.append(_card("battles", "battle", "★ Баттл недели", top, top.title,
                                   top.theme or "Голосование", _img(top.cover), f"/battles/{top.id}"))
        except Exception:
            pass

        # Мастерские — по рейтингу
        try:
            from apps.workshops.models import Workshop
            top = Workshop.objects.order_by("-rating", "-created_at").first()
            if top:
                meta = f"{top.city} · ★ {top.rating}" if top.rating else top.city
                picks.append(_card("workshops", "workshop", "★ Мастерская недели", top, top.name,
                                   meta, _img(top.cover) or _img(top.logo), f"/workshops/{top.id}"))
        except Exception:
            pass

        # Команды — топ по лайкам за неделю
        try:
            from apps.teams.models import Team
            qs = Team.objects.filter(is_active=True)
            top = (qs.annotate(recent=Count("likes", filter=Q(likes__created_at__gte=week)))
                     .order_by("-recent", "-created_at").first())
            if top:
                picks.append(_card("teams", "team", "★ Команда недели", top, top.name,
                                   top.city or "Косплей-команда", _img(top.cover) or _img(top.avatar), f"/teams/{top.id}"))
        except Exception:
            pass

        # Съёмки — свежая открытая
        try:
            from apps.shoots.models import Shoot
            top = Shoot.objects.filter(is_active=True, status="open").order_by("-created_at").first()
            if top:
                picks.append(_card("shoots", "shoot", "★ Съёмка недели", top, top.title,
                                   top.city or "Сбор команды", _img(top.cover), f"/shoots/{top.id}"))
        except Exception:
            pass

        # События — ближайшее предстоящее
        try:
            from apps.events.models import Event
            top = Event.objects.filter(date__gte=timezone.now().date()).order_by("date").first()
            if top:
                meta = f"{top.date:%d.%m}" + (f" · {top.city}" if top.city else "")
                picks.append(_card("events", "event", "★ Событие", top, top.title,
                                   meta, _img(top.cover), f"/events/{top.id}"))
        except Exception:
            pass

        # Гайды — свежий опубликованный
        try:
            from apps.guides.models import Guide
            top = Guide.objects.filter(is_published=True).order_by("-created_at").first()
            if top:
                picks.append(_card("guides", "guide", "★ Гайд недели", top, top.title,
                                   top.category or top.summary or "Гайд по крафту", _img(top.cover), f"/guides/{top.id}"))
        except Exception:
            pass

        # Прокат — свежий активный костюм
        try:
            from apps.rentals.models import Costume
            top = Costume.objects.filter(is_active=True).order_by("-id").first()
            if top:
                meta = top.city or "Костюм в аренду"
                if top.price_day:
                    meta = f"{meta} · {top.price_day} ₸/сут"
                picks.append(_card("rentals", "rent", "★ Прокат недели", top, top.title,
                                   meta, _img(top.image), f"/rent/{top.id}"))
        except Exception:
            pass

        # Магазины — свежий активный товар
        try:
            from apps.products.models import Product
            top = Product.objects.filter(is_active=True).order_by("-created_at").first()
            if top:
                meta = f"{top.price} ₸" if top.price else "по запросу"
                picks.append(_card("products", "shop", "★ Товар недели", top, top.title,
                                   meta, _img(top.image), f"/products/{top.id}"))
        except Exception:
            pass

        return Response(picks)
