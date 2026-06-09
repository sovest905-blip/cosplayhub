from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, BasePermission, IsAuthenticated, SAFE_METHODS
from rest_framework.response import Response

from apps.users.backends import CsrfExemptSessionAuthentication
from .models import Moodboard, MoodboardItem
from .serializers import (MoodboardDetailSerializer, MoodboardItemSerializer,
                          MoodboardListSerializer)


class IsOwnerOrStaffOrReadOnly(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user and (request.user.is_staff or obj.owner_id == request.user.id))


class MoodboardViewSet(viewsets.ModelViewSet):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsOwnerOrStaffOrReadOnly]

    def get_serializer_class(self):
        return MoodboardListSerializer if self.action == "list" else MoodboardDetailSerializer

    def get_queryset(self):
        qs = Moodboard.objects.select_related("owner").prefetch_related("items")
        user = self.request.user
        # Витрина на профиле: публичные доски конкретного владельца (магазин/локация).
        owner_id = self.request.query_params.get("owner")
        if owner_id:
            return qs.filter(owner_id=owner_id, is_public=True, is_active=True)
        if self.request.query_params.get("mine") and user.is_authenticated:
            return qs.filter(owner=user)
        if user.is_authenticated and user.is_staff:
            return qs
        if user.is_authenticated:
            from django.db.models import Q
            return qs.filter(Q(is_public=True, is_active=True) | Q(owner=user))
        return qs.filter(is_public=True, is_active=True)

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        if self.action == "create":
            return [IsAuthenticated()]
        return [IsOwnerOrStaffOrReadOnly()]

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def _can_edit(self, board):
        u = self.request.user
        return u.is_authenticated and (u.is_staff or u.id == board.owner_id)

    @action(detail=True, methods=["post"], url_path="items")
    def add_item(self, request, pk=None):
        board = self.get_object()
        if not self._can_edit(board):
            return Response({"detail": "Нет прав"}, status=403)
        if board.items.count() >= 60:
            return Response({"detail": "Лимит 60 картинок"}, status=400)
        image = request.FILES.get("image")
        image_url = (request.data.get("image_url") or "").strip()
        if not image and not image_url:
            return Response({"detail": "Загрузите файл или укажите ссылку"}, status=400)
        if image and not image.content_type.startswith("image/"):
            return Response({"detail": "Только изображения"}, status=400)
        item = MoodboardItem.objects.create(
            board=board, image=image if image else None,
            image_url=image_url if not image else "",
            caption=(request.data.get("caption") or "")[:200],
            price=(request.data.get("price") or "")[:40],
        )
        return Response(MoodboardItemSerializer(item).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], url_path=r"items/(?P<item_id>[0-9]+)")
    def del_item(self, request, pk=None, item_id=None):
        board = self.get_object()
        if not self._can_edit(board):
            return Response({"detail": "Нет прав"}, status=403)
        item = MoodboardItem.objects.filter(pk=item_id, board=board).first()
        if item:
            if item.image:
                item.image.delete(save=False)
            item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
