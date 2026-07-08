from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny, BasePermission, IsAuthenticated, SAFE_METHODS
from rest_framework.response import Response

from apps.users.backends import CsrfExemptSessionAuthentication
from .models import Guide, GuidePhoto
from .serializers import GuideSerializer

MAX_PHOTOS = 5

# Гайды пишут только эти роли (плюс всегда staff). Модерация — гейт после.
GUIDE_AUTHOR_ROLES = {"cosplayer", "workshop"}


def _photo_limit(user) -> int:
    """Базовый лимит фото гайда; Pro поднимает его в PRO_LIMIT_MULTIPLIER раз."""
    from apps.billing.models import PRO_LIMIT_MULTIPLIER
    return MAX_PHOTOS * PRO_LIMIT_MULTIPLIER if (user and user.is_pro) else MAX_PHOTOS


def _can_write_guides(user) -> bool:
    if not (user and user.is_authenticated):
        return False
    if user.is_staff:
        return True
    prof = getattr(user, "profile", None)
    roles = set(getattr(prof, "roles", None) or [])
    return bool(roles & GUIDE_AUTHOR_ROLES)


class CanWriteGuide(BasePermission):
    """Создавать гайд может косплеер, мастерская или админ."""
    message = "Гайды могут публиковать косплееры и мастерские."

    def has_permission(self, request, view):
        return _can_write_guides(request.user)


class IsAuthorOrStaffOrReadOnly(BasePermission):
    """Читать — все; менять/удалять — автор или staff."""
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user and (request.user.is_staff or obj.author_id == request.user.id))


class GuideViewSet(viewsets.ModelViewSet):
    """Гайды: читают все; пишет любой залогиненный; правит/удаляет автор или staff."""
    serializer_class = GuideSerializer
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthorOrStaffOrReadOnly]

    def get_queryset(self):
        qs = Guide.objects.select_related("author")
        user = self.request.user
        if self.request.query_params.get("mine") and user.is_authenticated:
            return qs.filter(author=user)
        if user.is_authenticated and user.is_staff:
            return qs
        if user.is_authenticated:
            from django.db.models import Q
            return qs.filter(Q(is_published=True) | Q(author=user))
        return qs.filter(is_published=True)

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        if self.action == "create":
            return [CanWriteGuide()]
        return [IsAuthorOrStaffOrReadOnly()]

    def perform_create(self, serializer):
        # Админ публикует сразу; остальные — на модерацию (не видно публично).
        user = self.request.user
        if user.is_staff:
            serializer.save(author=user, status="published", is_published=True)
        else:
            serializer.save(author=user, status="pending", is_published=False, moderation_note="")

    def perform_update(self, serializer):
        # Правка автором-неадмином уже опубликованного гайда → снова на модерацию.
        user = self.request.user
        guide = serializer.instance
        if not user.is_staff and guide.status == "published":
            serializer.save(status="pending", is_published=False, moderation_note="")
        else:
            serializer.save()

    def _can_edit(self, request, guide):
        return bool(request.user and (request.user.is_staff or guide.author_id == request.user.id))

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated],
            parser_classes=[MultiPartParser, FormParser])
    def photos(self, request, pk=None):
        """Загрузка фото в гайд (автор или staff, максимум 5)."""
        guide = self.get_object()
        if not self._can_edit(request, guide):
            return Response({"detail": "Не ваш гайд"}, status=status.HTTP_403_FORBIDDEN)
        limit = _photo_limit(guide.author)
        if guide.photos.count() >= limit:
            return Response({"detail": f"Максимум {limit} фото"}, status=status.HTTP_400_BAD_REQUEST)
        image = request.FILES.get("image")
        if not image:
            return Response({"detail": "Файл не передан"}, status=status.HTTP_400_BAD_REQUEST)
        photo = GuidePhoto.objects.create(guide=guide, image=image)
        return Response({"id": photo.id, "url": photo.image.url}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], url_path=r"photos/(?P<photo_id>\d+)",
            permission_classes=[IsAuthenticated])
    def delete_photo(self, request, pk=None, photo_id=None):
        """Удаление фото из гайда (автор или staff)."""
        guide = self.get_object()
        if not self._can_edit(request, guide):
            return Response({"detail": "Не ваш гайд"}, status=status.HTTP_403_FORBIDDEN)
        GuidePhoto.objects.filter(guide=guide, id=photo_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
