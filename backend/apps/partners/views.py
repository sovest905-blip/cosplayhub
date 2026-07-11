from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny

from .models import Partner
from .serializers import PartnerSerializer


class PartnerListView(ListAPIView):
    """GET /api/v1/partners/ — активные партнёры (лого-полоса + карточки в ленте)."""
    permission_classes = [AllowAny]
    serializer_class = PartnerSerializer
    pagination_class = None

    def get_queryset(self):
        return Partner.objects.filter(is_active=True)
