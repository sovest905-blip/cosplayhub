"""Админ-панель: CRUD партнёров (лого-полоса + карточки в ленте)."""
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.partners.models import Partner
from apps.partners.serializers import PartnerSerializer
from apps.users.backends import CsrfExemptSessionAuthentication


def _bool(v):
    return str(v).lower() in ("1", "true", "on", "yes")


class _StaffView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAdminUser]


class AdminPartnersView(_StaffView):
    """GET — все партнёры. POST — создать (multipart: name/url/logo/tier/... )."""

    def get(self, request):
        qs = Partner.objects.all()
        return Response(PartnerSerializer(qs, many=True, context={"request": request}).data)

    def post(self, request):
        ser = PartnerSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data, status=201)


class AdminPartnerUpdateView(_StaffView):
    """PATCH/POST — править (partial). DELETE — удалить."""

    def post(self, request, pk):
        p = Partner.objects.filter(pk=pk).first()
        if not p:
            return Response({"detail": "Не найдено"}, status=404)
        ser = PartnerSerializer(p, data=request.data, partial=True, context={"request": request})
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)

    def delete(self, request, pk):
        Partner.objects.filter(pk=pk).delete()
        return Response(status=204)
