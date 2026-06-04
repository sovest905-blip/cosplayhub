from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from common.permissions import IsOwnerOrReadOnly
from .models import Profile
from .serializers import ProfileSerializer

class ProfileViewSet(viewsets.ModelViewSet):
    """Каталог профилей + детальная.
    GET — всем, изменение — только владельцу."""
    queryset = Profile.objects.all().prefetch_related("socials")
    serializer_class = ProfileSerializer
    permission_classes = [AllowAny, IsOwnerOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["available_for_work"]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
