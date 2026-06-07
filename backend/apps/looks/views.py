from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, BasePermission, IsAuthenticated, SAFE_METHODS
from rest_framework.response import Response

from apps.users.backends import CsrfExemptSessionAuthentication
from .models import Look, LookLike
from .serializers import LookSerializer


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
        qs = Look.objects.select_related("author").prefetch_related("likes")
        user = self.request.user
        # ?mine=1 — только образы текущего пользователя (для кабинета)
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
            return [IsAuthenticated()]
        return [IsOwnerOrStaffOrReadOnly()]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

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
