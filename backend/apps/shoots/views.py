from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, BasePermission, IsAuthenticated, SAFE_METHODS
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.backends import CsrfExemptSessionAuthentication
from .models import Shoot, ShootParticipant
from .serializers import ShootSerializer

VALID_ROLES = {r for r, _ in Shoot.ROLE_CHOICES}


class IsOrganizerOrStaffOrReadOnly(BasePermission):
    """Читать — все; менять/удалять съёмку — организатор или staff."""
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user and (request.user.is_staff or obj.organizer_id == request.user.id))


def _qs():
    return (Shoot.objects.select_related("organizer", "organizer__profile",
                                         "location", "location__profile", "workshop")
            .prefetch_related("participants__user", "participants__user__profile"))


def _notify(user, text, url):
    from apps.notifications.models import notify
    notify(user, "system", text, url)


class ShootViewSet(viewsets.ModelViewSet):
    """Съёмки (сбор команды). Витрина всем; создаёт залогиненный; правит организатор/staff."""
    serializer_class = ShootSerializer
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsOrganizerOrStaffOrReadOnly]

    def get_queryset(self):
        qs = _qs()
        user = self.request.user
        # ?mine=1 — съёмки, которые я организовал (кабинет): все, включая отменённые/скрытые
        if self.request.query_params.get("mine") and user.is_authenticated:
            return qs.filter(organizer=user)
        # публичная витрина: активные. ?city= / ?role= (ищем эту роль в команду)
        if not (user.is_authenticated and user.is_staff):
            qs = qs.filter(is_active=True)
        city = self.request.query_params.get("city")
        if city:
            qs = qs.filter(city__icontains=city)
        role = self.request.query_params.get("role")
        if role:
            qs = qs.filter(looking_for__contains=[role])
        return qs

    def get_permissions(self):
        # ГРАБЛЯ looks/bookings: кастомные действия надо явно перечислять.
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        if self.action in ("create", "join", "invite", "participant"):
            return [IsAuthenticated()]
        return [IsOrganizerOrStaffOrReadOnly()]

    def perform_create(self, serializer):
        looking = serializer.validated_data.get("looking_for") or []
        clean = [r for r in looking if r in VALID_ROLES]
        serializer.save(organizer=self.request.user, is_active=True, looking_for=clean)

    # ── Заявка участника (попроситься в команду) ──
    @action(detail=True, methods=["post", "delete"])
    def join(self, request, pk=None):
        """POST {role, comment?} — заявка в команду. DELETE — отозвать своё участие."""
        shoot = self.get_object()
        user = request.user

        if request.method == "DELETE":
            ShootParticipant.objects.filter(shoot=shoot, user=user).delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        if shoot.organizer_id == user.id:
            return Response({"detail": "Вы организатор этой съёмки"}, status=400)
        if shoot.status in ("done", "cancelled") or not shoot.is_active:
            return Response({"detail": "Съёмка недоступна для заявок"}, status=400)
        role = (request.data.get("role") or "cosplayer").strip()
        if role not in VALID_ROLES:
            return Response({"detail": "Неизвестная роль"}, status=400)

        part, created = ShootParticipant.objects.get_or_create(
            shoot=shoot, user=user,
            defaults={"role": role, "status": "requested",
                      "comment": str(request.data.get("comment") or "")[:300]},
        )
        if created:
            _notify(shoot.organizer, f"Заявка в съёмку «{shoot.title}» от {user.username}",
                    f"/shoots/{shoot.id}")
        return Response(ShootSerializer(shoot, context={"request": request}).data,
                        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    # ── Приглашение участника организатором ──
    @action(detail=True, methods=["post"])
    def invite(self, request, pk=None):
        """POST {user_id, role} — организатор зовёт участника (status=invited)."""
        shoot = self.get_object()
        if not request.user.is_staff and shoot.organizer_id != request.user.id:
            return Response({"detail": "Только организатор"}, status=403)
        from apps.users.models import User
        target = User.objects.filter(pk=request.data.get("user_id")).first()
        if not target:
            return Response({"detail": "Пользователь не найден"}, status=404)
        if target.id == shoot.organizer_id:
            return Response({"detail": "Вы организатор"}, status=400)
        role = (request.data.get("role") or "cosplayer").strip()
        if role not in VALID_ROLES:
            return Response({"detail": "Неизвестная роль"}, status=400)
        part, created = ShootParticipant.objects.get_or_create(
            shoot=shoot, user=target, defaults={"role": role, "status": "invited"},
        )
        if created:
            _notify(target, f"Вас зовут в съёмку «{shoot.title}»", f"/shoots/{shoot.id}")
        return Response(ShootSerializer(shoot, context={"request": request}).data,
                        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    # ── Управление участником ──
    @action(detail=True, methods=["post"], url_path=r"participants/(?P<part_id>\d+)")
    def participant(self, request, pk=None, part_id=None):
        """POST {action: confirm|decline|remove}. Организатор/staff управляет любым;
        приглашённый сам может confirm/decline своё приглашение."""
        shoot = self.get_object()
        part = ShootParticipant.objects.filter(pk=part_id, shoot=shoot).select_related("user").first()
        if not part:
            return Response({"detail": "Участник не найден"}, status=404)

        is_org = request.user.is_staff or shoot.organizer_id == request.user.id
        is_self_invited = part.user_id == request.user.id and part.status == "invited"
        if not (is_org or is_self_invited):
            return Response({"detail": "Нет доступа"}, status=403)

        act = (request.data.get("action") or "").strip()
        if act == "confirm":
            part.status = "confirmed"
            part.save(update_fields=["status"])
            # уведомляем вторую сторону
            if is_org:
                _notify(part.user, f"Вас взяли в съёмку «{shoot.title}»", f"/shoots/{shoot.id}")
            else:
                _notify(shoot.organizer, f"{part.user.username} принял(а) приглашение в «{shoot.title}»",
                        f"/shoots/{shoot.id}")
        elif act == "decline":
            part.status = "declined"
            part.save(update_fields=["status"])
        elif act == "remove":
            if not is_org:
                return Response({"detail": "Только организатор"}, status=403)
            part.delete()
        else:
            return Response({"detail": "action: confirm|decline|remove"}, status=400)

        return Response(ShootSerializer(shoot, context={"request": request}).data)


class MyShootsView(APIView):
    """GET — мои съёмки: organized (я организатор) + participating (я участник)."""
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        organized = _qs().filter(organizer=request.user)
        part_ids = (ShootParticipant.objects
                    .filter(user=request.user)
                    .exclude(status="declined")
                    .values_list("shoot_id", flat=True))
        participating = _qs().filter(id__in=list(part_ids)).exclude(organizer=request.user)
        ctx = {"request": request}
        return Response({
            "organized": ShootSerializer(organized, many=True, context=ctx).data,
            "participating": ShootSerializer(participating, many=True, context=ctx).data,
        })
