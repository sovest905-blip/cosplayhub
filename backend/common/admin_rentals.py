"""Админ-панель: прокат костюмов (только staff) — список/поиск, скрыть/показать,
редактировать, удалить. Решения по заявкам аренды (подтвердить/отклонить) идут
через общий эндпоинт rentals/<pk>/ (RentalStatusView), staff там разрешён."""
import re

from django.db.models import Q
from rest_framework.response import Response

from common.admin_panel import _StaffView
from apps.rentals.models import Costume, RentalRequest

RENTAL_STATUS_RU = dict(RentalRequest.STATUS_CHOICES)


def _to_int(v):
    """Безопасно превращает ввод в число (или None) — не падает на мусоре."""
    if v is None:
        return None
    digits = re.sub(r"\D", "", str(v))
    return int(digits) if digits else None


def _costume_row(c):
    prof = getattr(c.owner, "profile", None)
    reqs = list(c.requests.all())
    return {
        "id": c.id,
        "title": c.title,
        "character": c.character,
        "description": c.description,
        "size": c.size,
        "price_day": c.price_day,
        "deposit": c.deposit,
        "city": c.city,
        "image": c.image.url if c.image else None,
        "status": c.status,
        "status_display": c.get_status_display(),
        "is_active": c.is_active,
        "owner": (prof.display_name if prof else None) or (c.owner.username if c.owner else ""),
        "owner_id": c.owner_id,
        "owner_profile_id": getattr(prof, "id", None),
        "created_at": c.created_at,
        "requests_pending": sum(1 for r in reqs if r.status == "pending"),
        "requests": [{
            "id": r.id,
            "user_id": r.user_id,
            "username": (getattr(getattr(r.user, "profile", None), "display_name", None)
                        or (r.user.username if r.user else "")),
            "profile_id": getattr(getattr(r.user, "profile", None), "id", None),
            "date_from": r.date_from,
            "date_to": r.date_to,
            "comment": r.comment,
            "status": r.status,
            "status_display": RENTAL_STATUS_RU.get(r.status, r.status),
        } for r in reqs],
    }


def _full_qs():
    return (Costume.objects.select_related("owner", "owner__profile")
            .prefetch_related("requests__user", "requests__user__profile"))


class AdminCostumesView(_StaffView):
    """GET — все костюмы напрокат (?q=, ?status=active|hidden|available|rented|unavailable)."""

    def get(self, request):
        q = (request.query_params.get("q") or "").strip()
        status_f = (request.query_params.get("status") or "").strip()
        qs = _full_qs().order_by("-created_at")
        if q:
            qs = qs.filter(Q(title__icontains=q) | Q(character__icontains=q)
                           | Q(city__icontains=q) | Q(owner__username__icontains=q))
        if status_f == "active":
            qs = qs.filter(is_active=True)
        elif status_f == "hidden":
            qs = qs.filter(is_active=False)
        elif status_f in ("available", "rented", "unavailable"):
            qs = qs.filter(status=status_f)
        return Response([_costume_row(c) for c in qs[:150]])


class AdminCostumeActiveView(_StaffView):
    """POST {is_active} — скрыть/показать костюм (модерация)."""

    def post(self, request, pk):
        c = Costume.objects.filter(pk=pk).first()
        if not c:
            return Response({"detail": "Не найдено"}, status=404)
        c.is_active = bool(request.data.get("is_active"))
        c.save(update_fields=["is_active"])
        return Response({"id": c.id, "is_active": c.is_active})


class AdminCostumeUpdateView(_StaffView):
    """PATCH — редактировать костюм (название/персонаж/город/цена/залог/размер/описание/статус)."""

    STR_FIELDS = ("title", "character", "city", "size", "description")

    def patch(self, request, pk):
        c = _full_qs().filter(pk=pk).first()
        if not c:
            return Response({"detail": "Не найдено"}, status=404)
        data = request.data
        for f in self.STR_FIELDS:
            if f in data:
                setattr(c, f, (data.get(f) or "").strip())
        if "price_day" in data:
            c.price_day = _to_int(data.get("price_day"))
        if "deposit" in data:
            c.deposit = _to_int(data.get("deposit"))
        if "status" in data and data.get("status") in dict(Costume.STATUS_CHOICES):
            c.status = data.get("status")
        c.save()
        return Response(_costume_row(c))


class AdminCostumeDeleteView(_StaffView):
    """DELETE — удалить костюм (вместе с картинкой)."""

    def delete(self, request, pk):
        c = Costume.objects.filter(pk=pk).first()
        if not c:
            return Response({"detail": "Не найдено"}, status=404)
        if c.image:
            c.image.delete(save=False)
        c.delete()
        return Response(status=204)
