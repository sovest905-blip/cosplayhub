"""Админ-панель: контент главной страницы (только staff) —
блок «Выбор редакции» (CuratedPick) и лента категорий (Category)."""
from rest_framework.response import Response

from common.admin_panel import _StaffView
from apps.homepage.models import CuratedPick, Category
from apps.homepage.serializers import CuratedPickSerializer, CategorySerializer


# ── Выбор редакции ────────────────────────────────────────────────────────────

class AdminCuratedView(_StaffView):
    """GET — все карточки (в т.ч. скрытые). POST — создать (multipart для файла)."""

    def get(self, request):
        qs = CuratedPick.objects.all()
        return Response(CuratedPickSerializer(qs, many=True, context={"request": request}).data)

    def post(self, request):
        ser = CuratedPickSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data, status=201)


class AdminCuratedUpdateView(_StaffView):
    """PATCH — обновить карточку. DELETE — удалить (вместе с файлом)."""

    def patch(self, request, pk):
        c = CuratedPick.objects.filter(pk=pk).first()
        if not c:
            return Response({"detail": "Не найдено"}, status=404)
        ser = CuratedPickSerializer(c, data=request.data, partial=True, context={"request": request})
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)

    def delete(self, request, pk):
        c = CuratedPick.objects.filter(pk=pk).first()
        if not c:
            return Response({"detail": "Не найдено"}, status=404)
        if c.image:
            c.image.delete(save=False)
        c.delete()
        return Response(status=204)


# ── Категории (лента) ─────────────────────────────────────────────────────────

class AdminCategoriesView(_StaffView):
    """GET — все категории (в т.ч. скрытые). POST — создать."""

    def get(self, request):
        qs = Category.objects.all()
        return Response(CategorySerializer(qs, many=True).data)

    def post(self, request):
        ser = CategorySerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data, status=201)


class AdminCategoryUpdateView(_StaffView):
    """PATCH — обновить категорию. DELETE — удалить."""

    def patch(self, request, pk):
        c = Category.objects.filter(pk=pk).first()
        if not c:
            return Response({"detail": "Не найдено"}, status=404)
        ser = CategorySerializer(c, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)

    def delete(self, request, pk):
        c = Category.objects.filter(pk=pk).first()
        if not c:
            return Response({"detail": "Не найдено"}, status=404)
        c.delete()
        return Response(status=204)
