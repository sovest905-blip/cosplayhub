from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, BasePermission, IsAuthenticated, SAFE_METHODS
from rest_framework.response import Response

from apps.users.backends import CsrfExemptSessionAuthentication
from .models import Battle, BattleEntry, BattleVote
from .serializers import BattleSerializer


class IsCreatorOrStaffOrReadOnly(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user and (request.user.is_staff or obj.created_by_id == request.user.id))


def _qs():
    return Battle.objects.prefetch_related(
        "entries__look", "entries__user__profile", "entries__votes", "votes",
    )


def _notify(user, text, url):
    from apps.notifications.models import notify
    notify(user, "system", text, url)


def _fresh(battle_id, request):
    return BattleSerializer(_qs().get(pk=battle_id), context={"request": request}).data


class BattleViewSet(viewsets.ModelViewSet):
    """Косплей-баттлы. Витрина всем; создаёт залогиненный; правит создатель/staff.
    Участие — enter (свой образ), голосование — vote (в окно голосования)."""
    serializer_class = BattleSerializer
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsCreatorOrStaffOrReadOnly]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        qs = _qs()
        user = self.request.user
        if self.request.query_params.get("mine") and user.is_authenticated:
            return qs.filter(created_by=user)
        if not (user.is_authenticated and user.is_staff):
            qs = qs.filter(is_active=True)
        return qs

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        if self.action in ("create", "enter", "vote"):
            return [IsAuthenticated()]
        return [IsCreatorOrStaffOrReadOnly()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, is_active=True)

    # ── Заявить свой образ в баттл ──
    @action(detail=True, methods=["post", "delete"])
    def enter(self, request, pk=None):
        """POST {look_id} — заявить свой образ. DELETE — снять свою заявку."""
        battle = self.get_object()
        user = request.user

        if request.method == "DELETE":
            BattleEntry.objects.filter(battle=battle, user=user).delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        if not battle.can_enter:
            return Response({"detail": "Приём заявок закрыт"}, status=400)
        if battle.entries.filter(user=user).exists():
            return Response({"detail": "Вы уже участвуете в этом баттле"}, status=400)

        from apps.looks.models import Look
        look = Look.objects.filter(pk=request.data.get("look_id")).first()
        if not look:
            return Response({"detail": "Образ не найден"}, status=404)
        if look.author_id != user.id:
            return Response({"detail": "Можно заявить только свой образ"}, status=403)
        if battle.entries.filter(look=look).exists():
            return Response({"detail": "Этот образ уже в баттле"}, status=400)

        BattleEntry.objects.create(battle=battle, look=look, user=user)
        return Response(_fresh(battle.id, request), status=status.HTTP_201_CREATED)

    # ── Голос ──
    @action(detail=True, methods=["post", "delete"])
    def vote(self, request, pk=None):
        """POST {entry_id} — отдать/сменить голос. DELETE — забрать голос."""
        battle = self.get_object()
        user = request.user

        if request.method == "DELETE":
            BattleVote.objects.filter(battle=battle, user=user).delete()
            return Response(_fresh(battle.id, request))

        if not battle.can_vote:
            return Response({"detail": "Голосование сейчас закрыто"}, status=400)
        entry = battle.entries.filter(pk=request.data.get("entry_id")).select_related("user").first()
        if not entry:
            return Response({"detail": "Участник не найден"}, status=404)
        if entry.user_id == user.id:
            return Response({"detail": "Нельзя голосовать за свой образ"}, status=400)

        vote, created = BattleVote.objects.get_or_create(
            battle=battle, user=user, defaults={"entry": entry},
        )
        if not created and vote.entry_id != entry.id:
            vote.entry = entry
            vote.save(update_fields=["entry"])
        return Response(_fresh(battle.id, request),
                        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
