from rest_framework import viewsets, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.users.backends import CsrfExemptSessionAuthentication
from common.permissions import IsOwnerOrReadOnly
from .models import Profile, Follow
from .serializers import ProfileSerializer

ROLE_ALIAS = {"photo": "photographer", "photographer": "photographer",
              "cosplayer": "cosplayer", "shop": "shop", "workshop": "workshop",
              "location": "location", "fan": "fan"}

class ProfileViewSet(viewsets.ModelViewSet):
    """Каталог профилей + детальная. GET — всем, изменение — владельцу.
    Фильтры: ?role=photo|cosplayer|... ?q=поиск по нику."""
    serializer_class = ProfileSerializer
    permission_classes = [AllowAny, IsOwnerOrReadOnly]

    def get_queryset(self):
        qs = Profile.objects.all().select_related("user").prefetch_related("socials")
        role = self.request.query_params.get("role")
        if role:
            mapped = ROLE_ALIAS.get(role, role)
            qs = qs.filter(roles__contains=[mapped])
        q = self.request.query_params.get("q")
        if q:
            qs = qs.filter(display_name__icontains=q)
        avail = self.request.query_params.get("available_for_work")
        if avail in ("true", "1"):
            qs = qs.filter(available_for_work=True)
        return qs.order_by("-created_at")

    def get_object(self):
        pk = self.kwargs["pk"]
        qs = self.get_queryset()
        # 1. По profile.pk
        try:
            obj = qs.get(pk=pk)
            self.check_object_permissions(self.request, obj)
            return obj
        except Profile.DoesNotExist:
            pass
        # 2. По user_id
        obj = qs.filter(user_id=pk).first()
        if obj:
            self.check_object_permissions(self.request, obj)
            return obj
        # 3. Юзер есть, но профиля нет → создаём пустой
        from apps.users.models import User
        from rest_framework.exceptions import NotFound
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            raise NotFound()
        obj, _ = Profile.objects.get_or_create(
            user=user,
            defaults={"display_name": user.username or user.email or f"user_{pk}", "roles": ["fan"]},
        )
        self.check_object_permissions(self.request, obj)
        return obj

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# ─────────── Подписки (фолловеры) ───────────

def _user_or_none(pk):
    from apps.users.models import User
    return User.objects.filter(pk=pk).first()


def _profiles_qs():
    return Profile.objects.all().select_related("user").prefetch_related("socials")


class FollowDetailView(APIView):
    """GET статус / POST подписаться / DELETE отписаться на /follow/<user_id>/."""
    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def _payload(self, request, target):
        following = Follow.objects.filter(follower=request.user, target=target).exists()
        return {"following": following, "followers_count": target.follower_set.count()}

    def get(self, request, user_id):
        target = _user_or_none(user_id)
        if not target:
            return Response({"detail": "Не найдено"}, status=404)
        return Response(self._payload(request, target))

    def post(self, request, user_id):
        target = _user_or_none(user_id)
        if not target:
            return Response({"detail": "Не найдено"}, status=404)
        if target.id == request.user.id:
            return Response({"detail": "Нельзя подписаться на себя"}, status=400)
        _, created = Follow.objects.get_or_create(follower=request.user, target=target)
        if created:
            from apps.notifications.models import notify
            who = getattr(request.user, "username", None) or "Кто-то"
            notify(target, "system", f"@{who} подписался на вас", url="/cabinet?tab=subs")
        return Response(self._payload(request, target), status=status.HTTP_201_CREATED if created else 200)

    def delete(self, request, user_id):
        target = _user_or_none(user_id)
        if not target:
            return Response({"detail": "Не найдено"}, status=404)
        Follow.objects.filter(follower=request.user, target=target).delete()
        return Response(self._payload(request, target))


class FollowingListView(APIView):
    """Профили, на которые подписан текущий пользователь."""
    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def get(self, request):
        target_ids = Follow.objects.filter(follower=request.user).values_list("target_id", flat=True)
        qs = _profiles_qs().filter(user_id__in=list(target_ids)).order_by("-created_at")
        return Response(ProfileSerializer(qs, many=True, context={"request": request}).data)


class FollowersListView(APIView):
    """Профили, которые подписаны на текущего пользователя."""
    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def get(self, request):
        follower_ids = Follow.objects.filter(target=request.user).values_list("follower_id", flat=True)
        qs = _profiles_qs().filter(user_id__in=list(follower_ids)).order_by("-created_at")
        return Response(ProfileSerializer(qs, many=True, context={"request": request}).data)
