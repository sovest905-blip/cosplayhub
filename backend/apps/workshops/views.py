from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from common.permissions import IsOwnerOrReadOnly
from .models import Workshop
from .serializers import WorkshopSerializer

class WorkshopViewSet(viewsets.ModelViewSet):
    queryset = Workshop.objects.all().prefetch_related("services")
    serializer_class = WorkshopSerializer
    permission_classes = [AllowAny, IsOwnerOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["type", "city", "is_pro"]

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
