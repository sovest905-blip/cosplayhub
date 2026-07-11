"""Админ-панель: CRUD библиотеки маскотов (Pro-компаньоны)."""
from django.utils.text import slugify
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.profiles.models import Mascot
from apps.profiles.serializers import MascotSerializer
from apps.users.backends import CsrfExemptSessionAuthentication


class _StaffView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAdminUser]


def _auto_slug(name, exclude_id=None):
    base = slugify(name, allow_unicode=False)[:36] or "mascot"
    s, i = base, 1
    qs = Mascot.objects.all()
    if exclude_id:
        qs = qs.exclude(id=exclude_id)
    while qs.filter(slug=s).exists():
        i += 1
        s = f"{base}-{i}"
    return s


class AdminMascotsView(_StaffView):
    """GET — все маскоты. POST — создать (multipart: name/image/...); slug генерится сам."""

    def get(self, request):
        qs = Mascot.objects.all()
        return Response(MascotSerializer(qs, many=True, context={"request": request}).data)

    def post(self, request):
        data = request.data.copy()
        if not data.get("slug"):
            data["slug"] = _auto_slug(data.get("name") or "mascot")
        ser = MascotSerializer(data=data, context={"request": request})
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data, status=201)


class AdminMascotUpdateView(_StaffView):
    """POST — править (partial). DELETE — удалить."""

    def post(self, request, pk):
        m = Mascot.objects.filter(pk=pk).first()
        if not m:
            return Response({"detail": "Не найдено"}, status=404)
        ser = MascotSerializer(m, data=request.data, partial=True, context={"request": request})
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)

    def delete(self, request, pk):
        Mascot.objects.filter(pk=pk).delete()
        return Response(status=204)
