from rest_framework import viewsets
from rest_framework.permissions import AllowAny, IsAdminUser

from apps.users.backends import CsrfExemptSessionAuthentication
from .models import Guide
from .serializers import GuideSerializer


class GuideViewSet(viewsets.ModelViewSet):
    """Гайды: читают все, создаёт/правит/удаляет только staff (админ)."""
    serializer_class = GuideSerializer
    authentication_classes = [CsrfExemptSessionAuthentication]

    def get_queryset(self):
        qs = Guide.objects.all()
        if not (self.request.user.is_authenticated and self.request.user.is_staff):
            qs = qs.filter(is_published=True)
        return qs

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        return [IsAdminUser()]
