from rest_framework import viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.users.backends import CsrfExemptSessionAuthentication
from common.permissions import IsOwnerOrReadOnly
from .models import Listing
from .serializers import ListingSerializer

TYPE_RU = dict(Listing.TYPE_CHOICES)


class ListingViewSet(viewsets.ModelViewSet):
    serializer_class = ListingSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def get_queryset(self):
        return Listing.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class PublicListingsView(APIView):
    """Публичная витрина объявлений (активные). ?types=sell,buy (барахолка) или job,collab (слоты)."""
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        types = (request.query_params.get("types") or "").strip()
        city = (request.query_params.get("city") or "").strip()
        qs = Listing.objects.filter(is_active=True).select_related("user").order_by("-created_at")
        wanted = [t for t in types.split(",") if t]
        if wanted:
            qs = qs.filter(type__in=wanted)
        if city:
            qs = qs.filter(city__icontains=city)
        return Response([{
            "id": l.id, "title": l.title, "description": l.description, "type": l.type,
            "type_display": TYPE_RU.get(l.type, l.type), "city": l.city, "price": l.price,
            "owner": l.user.username if l.user else "", "owner_id": l.user_id,
            "created_at": l.created_at,
        } for l in qs[:120]])
