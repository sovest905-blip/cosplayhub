"""Веб админ-панель: управление подписками/тарифами (Pro, мастерские).
Доступ только staff. Контроль сроков: выдать триал/продлить/отключить/правка даты.
"""
from datetime import datetime, time

from django.db.models import Q
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.backends import CsrfExemptSessionAuthentication
from apps.users.models import User
from apps.workshops.models import Workshop
from apps.billing.models import Subscription, add_months
from apps.billing.serializers import SubscriptionSerializer


def _parse_until(value):
    """'' / None → None (бессрочно). 'YYYY-MM-DD' или ISO → aware datetime (конец дня)."""
    if value in (None, "", "null"):
        return None
    dt = parse_datetime(value)
    if dt is None:
        d = parse_date(value)
        if d is None:
            return False  # сигнал об ошибке парсинга
        dt = datetime.combine(d, time(23, 59, 59))
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt, timezone.get_current_timezone())
    return dt


def _sub_row(sub: Subscription) -> dict:
    data = SubscriptionSerializer(sub).data
    data["user_username"] = sub.user.username if sub.user else ""
    data["user_id"] = sub.user_id
    return data


class _StaffView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAdminUser]


class AdminSubscriptionsView(_StaffView):
    """GET — все подписки (?q=, ?plan=pro|workshop, ?status=active|expired|disabled).
    POST — выдать/обновить подписку: {user_id, plan, workshop_id?, months?, unlimited?, note?}.
    """

    def get(self, request):
        q = (request.query_params.get("q") or "").strip()
        plan = (request.query_params.get("plan") or "").strip()
        status_f = (request.query_params.get("status") or "").strip()

        qs = Subscription.objects.select_related("user", "workshop").all()
        if plan in ("pro", "workshop"):
            qs = qs.filter(plan=plan)
        if q:
            qs = qs.filter(
                Q(user__username__icontains=q) | Q(user__email__icontains=q)
                | Q(workshop__name__icontains=q)
            )
        rows = [_sub_row(s) for s in qs[:200]]
        if status_f in ("active", "expired", "disabled"):
            rows = [r for r in rows if r["status"] == status_f]
        return Response(rows)

    def post(self, request):
        d = request.data
        plan = (d.get("plan") or "pro").strip()
        if plan not in ("pro", "workshop"):
            return Response({"detail": "Неизвестный тариф"}, status=400)

        # Единый тариф: грант «мастерской» = Pro её владельцу. Pro покрывает
        # профиль и все мастерские юзера, отдельных workshop-подписок больше нет.
        if plan == "workshop":
            workshop = Workshop.objects.filter(pk=d.get("workshop_id")).first()
            if not workshop:
                return Response({"detail": "Мастерская не найдена"}, status=400)
            user = workshop.owner
        else:
            user = User.objects.filter(pk=d.get("user_id")).first()
            if not user:
                return Response({"detail": "Пользователь не найден"}, status=404)

        sub = user.subscriptions.filter(plan="pro", workshop__isnull=True).first()

        unlimited = bool(d.get("unlimited"))
        months = d.get("months")
        if sub is None:
            until = None if unlimited else add_months(
                timezone.now(), int(months) if months else 6
            )
            sub = Subscription.objects.create(
                user=user, workshop=None, plan="pro", source="manual",
                active_until=until, note=(d.get("note") or "").strip(),
            )
        else:
            if unlimited:
                sub.active_until = None
            elif months:
                sub.extend(int(months), source="manual")
            sub.disabled = False
            if "note" in d:
                sub.note = (d.get("note") or "").strip()
            sub.save()
        return Response(_sub_row(sub), status=201)


class AdminSubscriptionUpdateView(_StaffView):
    """POST {active_until?, disabled?, add_months?, note?} — править подписку.
    DELETE — удалить подписку."""

    def post(self, request, pk):
        sub = Subscription.objects.filter(pk=pk).select_related("user", "workshop").first()
        if not sub:
            return Response({"detail": "Не найдено"}, status=404)
        d = request.data
        fields = []
        if "add_months" in d and d.get("add_months"):
            sub.extend(int(d["add_months"]), source="manual")
        if "active_until" in d:
            parsed = _parse_until(d.get("active_until"))
            if parsed is False:
                return Response({"detail": "Неверный формат даты (YYYY-MM-DD)"}, status=400)
            sub.active_until = parsed
            fields.append("active_until")
        if "disabled" in d:
            sub.disabled = bool(d.get("disabled"))
            fields.append("disabled")
        if "note" in d:
            sub.note = (d.get("note") or "").strip()
            fields.append("note")
        if fields:
            sub.save(update_fields=fields + ["updated_at"])
        return Response(_sub_row(sub))

    def delete(self, request, pk):
        Subscription.objects.filter(pk=pk).delete()
        return Response(status=204)
