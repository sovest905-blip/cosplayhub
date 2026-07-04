"""Публичное чтение контента главной (для всех). Управление — в common/admin_homepage.py."""
from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny

from .models import CuratedPick, Category
from .serializers import CuratedPickSerializer, CategorySerializer


class CuratedListView(ListAPIView):
    """GET /api/v1/curated/ — активные карточки блока «Выбор редакции»."""
    permission_classes = [AllowAny]
    serializer_class = CuratedPickSerializer
    pagination_class = None

    def get_queryset(self):
        return CuratedPick.objects.filter(is_active=True)


class CategoryListView(ListAPIView):
    """GET /api/v1/categories/ — активные категории (лента на главной)."""
    permission_classes = [AllowAny]
    serializer_class = CategorySerializer
    pagination_class = None

    def get_queryset(self):
        return Category.objects.filter(is_active=True)
