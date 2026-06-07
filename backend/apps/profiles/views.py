from rest_framework import viewsets, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.users.backends import CsrfExemptSessionAuthentication
from common.permissions import IsOwnerOrReadOnly
from .models import Profile, Follow, Favorite, ProfilePhoto
from .serializers import ProfileSerializer, ProfilePhotoSerializer

MAX_PHOTOS = 20
MAX_PHOTO_SIZE = 5 * 1024 * 1024  # 5 МБ

ROLE_ALIAS = {"photo": "photographer", "photographer": "photographer",
              "cosplayer": "cosplayer", "shop": "shop", "workshop": "workshop",
              "location": "location", "fan": "fan"}

class ProfileViewSet(viewsets.ModelViewSet):
    """Каталог профилей + детальная. GET — всем, изменение — владельцу.
    Фильтры: ?role=photo|cosplayer|... ?q=поиск по нику."""
    serializer_class = ProfileSerializer
    permission_classes = [AllowAny, IsOwnerOrReadOnly]

    def get_queryset(self):
        qs = Profile.objects.all().select_related("user").prefetch_related("socials", "photos")
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


# ─────────── Галерея фото профиля (фотозоны) ───────────

def _my_profile(request):
    prof, _ = Profile.objects.get_or_create(
        user=request.user,
        defaults={"display_name": request.user.username or request.user.email or "user", "roles": ["fan"]},
    )
    return prof


class MyPhotosView(APIView):
    """GET — мои фото. POST — загрузить (multipart 'file'), лимит 20 шт, ≤5МБ, только картинки."""
    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def get(self, request):
        prof = _my_profile(request)
        return Response(ProfilePhotoSerializer(prof.photos.all(), many=True).data)

    def post(self, request):
        prof = _my_profile(request)
        if prof.photos.count() >= MAX_PHOTOS:
            return Response({"detail": f"Лимит {MAX_PHOTOS} фото достигнут"}, status=status.HTTP_400_BAD_REQUEST)
        file = request.FILES.get("file")
        if not file:
            return Response({"detail": "Файл не передан"}, status=status.HTTP_400_BAD_REQUEST)
        if not file.content_type.startswith("image/"):
            return Response({"detail": "Только изображения"}, status=status.HTTP_400_BAD_REQUEST)
        if file.size > MAX_PHOTO_SIZE:
            return Response({"detail": "Максимум 5 МБ"}, status=status.HTTP_400_BAD_REQUEST)
        photo = ProfilePhoto.objects.create(profile=prof, image=file)
        return Response(ProfilePhotoSerializer(photo).data, status=status.HTTP_201_CREATED)


class MyPhotoDeleteView(APIView):
    """DELETE — удалить своё фото."""
    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def delete(self, request, photo_id):
        prof = getattr(request.user, "profile", None)
        if not prof:
            return Response(status=status.HTTP_204_NO_CONTENT)
        photo = ProfilePhoto.objects.filter(pk=photo_id, profile=prof).first()
        if photo:
            photo.image.delete(save=False)
            photo.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ─────────── Подписки (фолловеры) ───────────

def _user_or_none(pk):
    from apps.users.models import User
    return User.objects.filter(pk=pk).first()


def _profiles_qs():
    return Profile.objects.all().select_related("user").prefetch_related("socials", "photos")


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


# ─────────── Избранное (закладки) ───────────

VALID_FAV_KINDS = ("profile", "workshop")


class FavoriteDetailView(APIView):
    """GET статус / POST сохранить / DELETE убрать на /favorites/<kind>/<object_id>/."""
    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def _check(self, kind):
        return kind in VALID_FAV_KINDS

    def get(self, request, kind, object_id):
        if not self._check(kind):
            return Response({"detail": "Неверный тип"}, status=400)
        fav = Favorite.objects.filter(user=request.user, kind=kind, object_id=object_id).exists()
        return Response({"favorited": fav})

    def post(self, request, kind, object_id):
        if not self._check(kind):
            return Response({"detail": "Неверный тип"}, status=400)
        Favorite.objects.get_or_create(user=request.user, kind=kind, object_id=object_id)
        return Response({"favorited": True}, status=status.HTTP_201_CREATED)

    def delete(self, request, kind, object_id):
        if not self._check(kind):
            return Response({"detail": "Неверный тип"}, status=400)
        Favorite.objects.filter(user=request.user, kind=kind, object_id=object_id).delete()
        return Response({"favorited": False})


class FavoriteListView(APIView):
    """Список избранного текущего пользователя с раскрытыми объектами."""
    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def get(self, request):
        favs = list(Favorite.objects.filter(user=request.user))
        profile_ids = [f.object_id for f in favs if f.kind == "profile"]
        workshop_ids = [f.object_id for f in favs if f.kind == "workshop"]

        from apps.workshops.models import Workshop
        from apps.workshops.serializers import WorkshopSerializer

        profiles = {p.id: p for p in _profiles_qs().filter(id__in=profile_ids)}
        workshops = {w.id: w for w in Workshop.objects.filter(id__in=workshop_ids).prefetch_related("services")}

        items = []
        for f in favs:  # уже отсортированы по -created_at
            if f.kind == "profile" and f.object_id in profiles:
                items.append({"kind": "profile",
                              "item": ProfileSerializer(profiles[f.object_id], context={"request": request}).data})
            elif f.kind == "workshop" and f.object_id in workshops:
                items.append({"kind": "workshop",
                              "item": WorkshopSerializer(workshops[f.object_id], context={"request": request}).data})
        return Response(items)
