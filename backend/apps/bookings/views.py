from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, BasePermission, IsAuthenticated, SAFE_METHODS
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.backends import CsrfExemptSessionAuthentication
from .models import Booking, Slot
from .serializers import MyBookingSerializer, SlotSerializer


class IsOwnerOrStaffOrReadOnly(BasePermission):
    """Читать — все; менять/удалять слот — владелец или staff."""
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user and (request.user.is_staff or obj.owner_id == request.user.id))


class SlotViewSet(viewsets.ModelViewSet):
    """Слоты аренды локации. Витрина всем; создаёт залогиненный; правит владелец или staff.
    Бронь — действие book (заявка → владелец подтверждает в кабинете)."""
    serializer_class = SlotSerializer
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsOwnerOrStaffOrReadOnly]

    def get_queryset(self):
        qs = Slot.objects.select_related("owner").prefetch_related("bookings__user")
        user = self.request.user
        # ?mine=1 — слоты текущего владельца (кабинет): все, включая прошедшие/выключенные
        if self.request.query_params.get("mine") and user.is_authenticated:
            return qs.filter(owner=user)
        # ?owner=<user_id> — публичная витрина на профиле: активные, начиная с сегодня
        owner_id = self.request.query_params.get("owner")
        if owner_id:
            return qs.filter(owner_id=owner_id, is_active=True, date__gte=timezone.localdate())
        if user.is_authenticated and user.is_staff:
            return qs
        return qs.filter(is_active=True, date__gte=timezone.localdate())

    def get_permissions(self):
        # ГРАБЛЯ looks: кастомные действия надо явно перечислять — иначе падают в object-permission.
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        if self.action in ("create", "book"):
            return [IsAuthenticated()]
        return [IsOwnerOrStaffOrReadOnly()]

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user, is_active=True)

    @action(detail=True, methods=["post", "delete"])
    def book(self, request, pk=None):
        """POST {comment?} — заявка на бронь. DELETE — отменить свою заявку."""
        slot = self.get_object()
        user = request.user

        if request.method == "DELETE":
            updated = Booking.objects.filter(
                slot=slot, user=user, status__in=["pending", "approved"]
            ).update(status="cancelled")
            if updated:
                from apps.notifications.models import notify
                notify(slot.owner, "system",
                       f"{user.username} отменил(а) бронь на {slot.date}",
                       "/cabinet?tab=roles")
            return Response(status=status.HTTP_204_NO_CONTENT)

        if slot.owner_id == user.id:
            return Response({"detail": "Нельзя бронировать свой слот"}, status=400)
        if not slot.is_active or slot.date < timezone.localdate():
            return Response({"detail": "Слот недоступен"}, status=400)
        if slot.bookings.filter(status="approved").exclude(user=user).exists():
            return Response({"detail": "Слот уже забронирован"}, status=400)

        existing = slot.bookings.filter(user=user, status__in=["pending", "approved"]).first()
        if existing:
            return Response({"my_booking": existing.status})  # идемпотентно

        Booking.objects.create(
            slot=slot, user=user,
            comment=str(request.data.get("comment") or "")[:300],
        )
        from apps.notifications.models import notify
        notify(slot.owner, "system",
               f"Заявка на бронь от {user.username}: {slot.date} {slot.time_start:%H:%M}",
               "/cabinet?tab=roles")
        return Response({"my_booking": "pending"}, status=201)


class MyBookingsView(APIView):
    """GET — мои заявки на брони (как гостя)."""
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Booking.objects.filter(user=request.user).select_related("slot__owner")[:100]
        return Response(MyBookingSerializer(qs, many=True).data)


class BookingStatusView(APIView):
    """POST {status: approved|declined} — владелец слота решает по заявке."""
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        booking = Booking.objects.filter(pk=pk).select_related("slot__owner", "user").first()
        if not booking:
            return Response({"detail": "Не найдено"}, status=404)
        if not request.user.is_staff and booking.slot.owner_id != request.user.id:
            return Response({"detail": "Нет доступа"}, status=403)

        new_status = request.data.get("status")
        if new_status not in ("approved", "declined"):
            return Response({"detail": "status: approved или declined"}, status=400)
        if booking.status == "cancelled":
            return Response({"detail": "Заявка уже отменена гостем"}, status=400)

        from apps.notifications.models import notify
        slot = booking.slot
        booking.status = new_status
        booking.save(update_fields=["status"])

        # /people/<id> ждёт PROFILE id, не user id (грабля как у избранного)
        prof = getattr(slot.owner, "profile", None)
        loc_url = f"/people/{prof.id}" if prof else "/locations"

        if new_status == "approved":
            # Остальные ожидающие заявки на слот — отклоняем с уведомлением
            others = slot.bookings.filter(status="pending").exclude(pk=booking.pk)
            for other in others.select_related("user"):
                notify(other.user, "system",
                       f"Слот {slot.date} занят — заявка отклонена", loc_url)
            others.update(status="declined")
            notify(booking.user, "system",
                   f"Бронь подтверждена: {slot.date} {slot.time_start:%H:%M}", loc_url)
        else:
            notify(booking.user, "system",
                   f"Заявка на {slot.date} отклонена", loc_url)

        return Response(SlotSerializer(slot, context={"request": request}).data)
