from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, BasePermission, IsAuthenticated, SAFE_METHODS
from rest_framework.response import Response

from apps.users.backends import CsrfExemptSessionAuthentication
from .models import Product, ProductPhoto, product_photo_limit
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

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated],
            parser_classes=[MultiPartParser, FormParser, JSONParser])
    def photos(self, request, pk=None):
        """Загрузка фото товара (только владелец; лимит 3, у Pro 10)."""
        product = self.get_object()
        if not (request.user.is_staff or product.owner_id == request.user.id):
            return Response({"detail": "Не ваш товар"}, status=status.HTTP_403_FORBIDDEN)
        limit = product_photo_limit(product.owner)
        if product.photos.count() >= limit:
            return Response({"detail": f"Максимум {limit} фото"}, status=status.HTTP_400_BAD_REQUEST)
        image = request.FILES.get("image")
        if not image:
            return Response({"detail": "Файл не передан"}, status=status.HTTP_400_BAD_REQUEST)
        photo = ProductPhoto.objects.create(product=product, image=image)
        return Response({"id": photo.id, "url": photo.image.url}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], url_path=r"photos/(?P<photo_id>\d+)",
            permission_classes=[IsAuthenticated])
    def delete_photo(self, request, pk=None, photo_id=None):
        """Удаление фото товара (только владелец или staff)."""
        product = self.get_object()
        if not (request.user.is_staff or product.owner_id == request.user.id):
            return Response({"detail": "Не ваш товар"}, status=status.HTTP_403_FORBIDDEN)
        ProductPhoto.objects.filter(product=product, id=photo_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
