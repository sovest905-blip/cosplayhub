from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from apps.users.backends import CsrfExemptSessionAuthentication
from common.permissions import IsOwnerOrReadOnly
from .models import Listing
from .serializers import ListingSerializer


class ListingViewSet(viewsets.ModelViewSet):
    serializer_class = ListingSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def get_queryset(self):
        return Listing.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
