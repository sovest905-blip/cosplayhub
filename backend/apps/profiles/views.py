from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from common.permissions import IsOwnerOrReadOnly
from .models import Profile
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
            defaults={"display_name": user.username or user.email or f"user_{pk}"},
        )
        self.check_object_permissions(self.request, obj)
        return obj

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
