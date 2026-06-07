from rest_framework import viewsets
from rest_framework.permissions import AllowAny, IsAdminUser

from apps.users.backends import CsrfExemptSessionAuthentication
from .models import Event
from .serializers import EventSerializer


class EventViewSet(viewsets.ModelViewSet):
    """События: читают все, создаёт/правит/удаляет только staff (админ)."""
    serializer_class = EventSerializer
    authentication_classes = [CsrfExemptSessionAuthentication]

    def get_queryset(self):
        qs = Event.objects.all()
        if not (self.request.user.is_authenticated and self.request.user.is_staff):
            qs = qs.filter(is_published=True)
        return qs

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        return [IsAdminUser()]
