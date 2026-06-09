from rest_framework import viewsets
from rest_framework.permissions import AllowAny, BasePermission, IsAuthenticated, SAFE_METHODS

from apps.users.backends import CsrfExemptSessionAuthentication
from .models import Product
from .serializers import ProductSerializer


class IsOwnerOrStaffOrReadOnly(BasePermission):
    """Читать — все; менять/удалять — владелец или staff (модерация)."""
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user and (request.user.is_staff or obj.owner_id == request.user.id))


class ProductViewSet(viewsets.ModelViewSet):
    """Товары магазина: витрина всем; создаёт залогиненный; правит/удаляет владелец или staff."""
    serializer_class = ProductSerializer
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsOwnerOrStaffOrReadOnly]

    def get_queryset(self):
        qs = Product.objects.select_related("owner")
        user = self.request.user
        # ?mine=1 — товары текущего пользователя (кабинет)
        if self.request.query_params.get("mine") and user.is_authenticated:
            return qs.filter(owner=user)
        # ?owner=<user_id> — активные товары конкретного продавца (витрина на профиле)
        owner_id = self.request.query_params.get("owner")
        if owner_id:
            return qs.filter(owner_id=owner_id, is_active=True)
        if user.is_authenticated and user.is_staff:
            return qs
        if user.is_authenticated:
            from django.db.models import Q
            return qs.filter(Q(is_active=True) | Q(owner=user))
        return qs.filter(is_active=True)

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        if self.action == "create":
            return [IsAuthenticated()]
        return [IsOwnerOrStaffOrReadOnly()]

    def perform_create(self, serializer):
        # is_active нельзя доверять из multipart (BooleanField для HTML-инпута даёт False при отсутствии).
        serializer.save(owner=self.request.user, is_active=True)
