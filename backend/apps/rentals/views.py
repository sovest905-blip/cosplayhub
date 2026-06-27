from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, BasePermission, IsAuthenticated, SAFE_METHODS
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.backends import CsrfExemptSessionAuthentication
from .models import Costume, RentalRequest
from .serializers import CostumeSerializer, MyRentalSerializer


class IsOwnerOrStaffOrReadOnly(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user and (request.user.is_staff or obj.owner_id == request.user.id))


def _qs():
    return (Costume.objects.select_related("owner", "owner__profile")
            .prefetch_related("requests__user", "requests__user__profile"))


def _notify(user, text, url):
    from apps.notifications.models import notify
    notify(user, "system", text, url)


def _parse_date(v):
    from django.utils.dateparse import parse_date
    return parse_date(v) if v else None


class CostumeViewSet(viewsets.ModelViewSet):
    """Прокат костюмов. Витрина всем; создаёт залогиненный; правит владелец/staff.
    Аренда — действие request (заявка → владелец подтверждает)."""
    serializer_class = CostumeSerializer
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsOwnerOrStaffOrReadOnly]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        qs = _qs()
        user = self.request.user
        if self.request.query_params.get("mine") and user.is_authenticated:
            return qs.filter(owner=user)
        owner_id = self.request.query_params.get("owner")
        if owner_id:
            return qs.filter(owner_id=owner_id, is_active=True)
        if not (user.is_authenticated and user.is_staff):
            qs = qs.filter(is_active=True)
        city = self.request.query_params.get("city")
        if city:
            qs = qs.filter(city__icontains=city)
        return qs

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        if self.action in ("create", "request"):
            return [IsAuthenticated()]
        return [IsOwnerOrStaffOrReadOnly()]

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user, is_active=True)

    @action(detail=True, methods=["post", "delete"])
    def request(self, request, pk=None):
        """POST {date_from?, date_to?, comment?} — заявка на аренду. DELETE — отменить свою."""
        costume = self.get_object()
        user = request.user

        if request.method == "DELETE":
            RentalRequest.objects.filter(
                costume=costume, user=user, status__in=["pending", "approved"]
            ).update(status="cancelled")
            return Response(status=status.HTTP_204_NO_CONTENT)

        if costume.owner_id == user.id:
            return Response({"detail": "Нельзя арендовать свой костюм"}, status=400)
        if not costume.is_active or costume.status == "unavailable":
            return Response({"detail": "Костюм недоступен"}, status=400)

        existing = costume.requests.filter(user=user, status__in=["pending", "approved"]).first()
        if existing:
            return Response({"my_request": existing.status})  # идемпотентно

        RentalRequest.objects.create(
            costume=costume, user=user,
            date_from=_parse_date(request.data.get("date_from")),
            date_to=_parse_date(request.data.get("date_to")),
            comment=str(request.data.get("comment") or "")[:300],
        )
        _notify(costume.owner, f"Заявка на аренду «{costume.title}» от {user.username}",
                f"/rent/{costume.id}")
        return Response({"my_request": "pending"}, status=201)


class MyRentalsView(APIView):
    """GET — мои заявки на аренду (как арендатора)."""
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = RentalRequest.objects.filter(user=request.user).select_related("costume__owner")[:100]
        return Response(MyRentalSerializer(qs, many=True).data)


class RentalStatusView(APIView):
    """POST {status: approved|declined} — владелец костюма решает по заявке."""
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        req = RentalRequest.objects.filter(pk=pk).select_related("costume__owner", "user").first()
        if not req:
            return Response({"detail": "Не найдено"}, status=404)
        if not request.user.is_staff and req.costume.owner_id != request.user.id:
            return Response({"detail": "Нет доступа"}, status=403)

        new_status = request.data.get("status")
        if new_status not in ("approved", "declined"):
            return Response({"detail": "status: approved или declined"}, status=400)
        if req.status == "cancelled":
            return Response({"detail": "Заявка уже отменена арендатором"}, status=400)

        req.status = new_status
        req.save(update_fields=["status"])
        url = f"/rent/{req.costume_id}"
        if new_status == "approved":
            _notify(req.user, f"Аренда «{req.costume.title}» подтверждена", url)
        else:
            _notify(req.user, f"Заявка на «{req.costume.title}» отклонена", url)
        # вернуть свежий костюм с заявками
        costume = _qs().get(pk=req.costume_id)
        return Response(CostumeSerializer(costume, context={"request": request}).data)
