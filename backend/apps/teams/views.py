from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, BasePermission, IsAuthenticated, SAFE_METHODS
from rest_framework.response import Response

from apps.users.backends import CsrfExemptSessionAuthentication
from .models import Team, TeamLike, TeamMember
from .serializers import TeamDetailSerializer, TeamListSerializer


class IsCaptainOrStaffOrReadOnly(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user and (request.user.is_staff or obj.captain_id == request.user.id))


class TeamViewSet(viewsets.ModelViewSet):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsCaptainOrStaffOrReadOnly]

    def get_serializer_class(self):
        return TeamListSerializer if self.action == "list" else TeamDetailSerializer

    def get_queryset(self):
        qs = Team.objects.select_related("captain").prefetch_related("members", "likes")
        user = self.request.user
        if self.request.query_params.get("mine") and user.is_authenticated:
            return qs.filter(members__user=user).distinct()
        if user.is_authenticated and user.is_staff:
            return qs
        return qs.filter(is_active=True)

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        if self.action in ("create", "join", "leave", "like"):
            return [IsAuthenticated()]
        return [IsCaptainOrStaffOrReadOnly()]

    def perform_create(self, serializer):
        team = serializer.save(captain=self.request.user)
        TeamMember.objects.create(team=team, user=self.request.user, role_in_team="Капитан", status="member")

    # ── вступление / выход ──
    @action(detail=True, methods=["post"])
    def join(self, request, pk=None):
        team = self.get_object()
        if team.captain_id == request.user.id:
            return Response({"detail": "Вы капитан"}, status=400)
        m, created = TeamMember.objects.get_or_create(
            team=team, user=request.user,
            defaults={"status": "member" if team.is_open else "pending"},
        )
        return Response({"my_status": m.status})

    @action(detail=True, methods=["delete"])
    def leave(self, request, pk=None):
        team = self.get_object()
        if team.captain_id == request.user.id:
            return Response({"detail": "Капитан не может выйти. Удалите команду или передайте капитанство."}, status=400)
        TeamMember.objects.filter(team=team, user=request.user).delete()
        return Response({"my_status": "none"})

    # ── лайк / подписка ──
    @action(detail=True, methods=["post", "delete"])
    def like(self, request, pk=None):
        team = self.get_object()
        if request.method == "POST":
            TeamLike.objects.get_or_create(team=team, user=request.user)
            liked = True
        else:
            TeamLike.objects.filter(team=team, user=request.user).delete()
            liked = False
        return Response({"likes_count": TeamLike.objects.filter(team_id=team.pk).count(), "is_liked": liked})

    # ── управление участником (капитан/staff) ──
    @action(detail=True, methods=["post"], url_path=r"members/(?P<user_id>[0-9]+)",
            permission_classes=[IsCaptainOrStaffOrReadOnly])
    def manage_member(self, request, pk=None, user_id=None):
        team = self.get_object()
        self.check_object_permissions(request, team)
        m = TeamMember.objects.filter(team=team, user_id=user_id).first()
        if not m:
            return Response({"detail": "Не найдено"}, status=404)
        act = request.data.get("action")
        if act == "approve":
            m.status = "member"; m.save(update_fields=["status"])
        elif act in ("reject", "remove"):
            m.delete()
        elif act == "role":
            m.role_in_team = (request.data.get("role_in_team") or "Участник")[:60]
            m.save(update_fields=["role_in_team"])
        else:
            return Response({"detail": "Неверное действие"}, status=400)
        return Response({"ok": True})

    # ── привязка событий (капитан/staff) ──
    @action(detail=True, methods=["post", "delete"], url_path=r"events/(?P<event_id>[0-9]+)",
            permission_classes=[IsCaptainOrStaffOrReadOnly])
    def manage_event(self, request, pk=None, event_id=None):
        team = self.get_object()
        self.check_object_permissions(request, team)
        from apps.events.models import Event
        ev = Event.objects.filter(pk=event_id).first()
        if not ev:
            return Response({"detail": "Событие не найдено"}, status=404)
        if request.method == "POST":
            team.events.add(ev)
        else:
            team.events.remove(ev)
        return Response({"ok": True}, status=status.HTTP_200_OK)
