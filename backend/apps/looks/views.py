from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, BasePermission, IsAuthenticated, SAFE_METHODS
from rest_framework.response import Response

from apps.users.backends import CsrfExemptSessionAuthentication
from .models import Look, LookLike, LookUpdate
from .serializers import LookSerializer, LookUpdateSerializer


class IsOwnerOrStaffOrReadOnly(BasePermission):
    """Читать — все; менять/удалять — автор или staff (модерация)."""
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user and (request.user.is_staff or obj.author_id == request.user.id))


class LookViewSet(viewsets.ModelViewSet):
    """Образы: лента всем; создаёт залогиненный; правит/удаляет автор или staff."""
    serializer_class = LookSerializer
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsOwnerOrStaffOrReadOnly]

    def get_queryset(self):
        qs = (Look.objects.select_related("author", "author__profile")
              .prefetch_related("likes", "updates__workshop"))
        user = self.request.user
        stage = self.request.query_params.get("stage")
        if stage in ("planned", "wip", "done"):
            qs = qs.filter(stage=stage)
        # ?mine=1 — только образы текущего пользователя (для кабинета)
        if self.request.query_params.get("mine") and user.is_authenticated:
            return qs.filter(author=user)
        # ?author=<user_id> — опубликованные образы конкретного автора (страница профиля)
        author_id = self.request.query_params.get("author")
        if author_id:
            return qs.filter(author_id=author_id, is_published=True)
        if user.is_authenticated and user.is_staff:
            return qs
        if user.is_authenticated:
            from django.db.models import Q
            return qs.filter(Q(is_published=True) | Q(author=user))
        return qs.filter(is_published=True)

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        # like ОБЯЗАН быть тут: иначе падает в IsOwnerOrStaffOrReadOnly и лайкнуть
        # чужой образ может только автор/staff (поймано test_like_toggle). get_permissions
        # перекрывает permission_classes у @action, поэтому действие надо перечислять явно.
        if self.action in ("create", "like", "updates", "boost"):
            return [IsAuthenticated()]
        return [IsOwnerOrStaffOrReadOnly()]

    def perform_create(self, serializer):
        # Новый образ публикуется сразу. is_published нельзя доверять из multipart-формы:
        # DRF BooleanField.get_value для HTML-инпута при отсутствии поля возвращает False.
        # Скрывают образы потом из админки (JSON-PATCH). Поэтому форсим True здесь.
        serializer.save(author=self.request.user, is_published=True)

    @action(detail=True, methods=["post", "delete"], permission_classes=[IsAuthenticated])
    def like(self, request, pk=None):
        look = self.get_object()
        if request.method == "POST":
            LookLike.objects.get_or_create(user=request.user, look=look)
            liked = True
        else:
            LookLike.objects.filter(user=request.user, look=look).delete()
            liked = False
        # Свежий счёт (не из prefetch-кэша get_object).
        count = LookLike.objects.filter(look_id=look.pk).count()
        return Response({"likes_count": count, "is_liked": liked}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get", "post"])
    def updates(self, request, pk=None):
        """GET — этапы работы (всем). POST — добавить этап (только автор):
        {text?, image?, workshop?}."""
        look = self.get_object()
        if request.method == "GET":
            qs = look.updates.select_related("workshop").all()
            return Response(LookUpdateSerializer(qs, many=True).data)

        if not (request.user.is_staff or look.author_id == request.user.id):
            return Response({"detail": "Не ваш образ"}, status=status.HTTP_403_FORBIDDEN)
        text = str(request.data.get("text") or "").strip()
        image = request.FILES.get("image")
        if not text and not image:
            return Response({"detail": "Добавьте текст или фото этапа"}, status=status.HTTP_400_BAD_REQUEST)
        from apps.workshops.models import Workshop
        ws = None
        wid = request.data.get("workshop")
        if wid:
            ws = Workshop.objects.filter(pk=wid).first()
        upd = LookUpdate.objects.create(look=look, text=text, image=image, workshop=ws)
        return Response(LookUpdateSerializer(upd).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post", "delete"])
    def boost(self, request, pk=None):
        """POST — продвинуть образ в ленте на 7 дней (Pro, только свой). DELETE — снять."""
        look = self.get_object()
        if not (request.user.is_staff or look.author_id == request.user.id):
            return Response({"detail": "Не ваш образ"}, status=status.HTTP_403_FORBIDDEN)
        if request.method == "DELETE":
            look.boosted_until = None
            look.save(update_fields=["boosted_until"])
            return Response({"is_boosted": False})
        if not request.user.is_pro:
            return Response({"detail": "Продвижение образа — фишка Pro"}, status=status.HTTP_403_FORBIDDEN)
        from datetime import timedelta
        from django.utils import timezone
        look.boosted_until = timezone.now() + timedelta(days=7)
        look.save(update_fields=["boosted_until"])
        return Response({"is_boosted": True, "boosted_until": look.boosted_until})

    @action(detail=True, methods=["delete"], url_path=r"updates/(?P<update_id>\d+)")
    def delete_update(self, request, pk=None, update_id=None):
        """Удалить этап работы (автор или staff)."""
        look = self.get_object()
        if not (request.user.is_staff or look.author_id == request.user.id):
            return Response({"detail": "Не ваш образ"}, status=status.HTTP_403_FORBIDDEN)
        LookUpdate.objects.filter(pk=update_id, look=look).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
