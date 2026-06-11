from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response

from apps.users.backends import CsrfExemptSessionAuthentication
from .models import Event, EventAttendee
from .serializers import EventSerializer


class EventViewSet(viewsets.ModelViewSet):
    """События: читают все, создаёт/правит/удаляет только staff (админ).
    «Пойду» — любой залогиненный."""
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
        if self.action in ("attend", "mine"):
            return [IsAuthenticated()]
        return [IsAdminUser()]

    @action(detail=True, methods=["post", "delete"])
    def attend(self, request, pk=None):
        """POST — отметиться «Пойду», DELETE — снять отметку."""
        event = self.get_object()
        if request.method == "POST":
            EventAttendee.objects.get_or_create(event=event, user=request.user)
        else:
            EventAttendee.objects.filter(event=event, user=request.user).delete()
        return Response(self.get_serializer(event).data,
                        status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"])
    def mine(self, request):
        """Ближайшие события, куда пользователь отметился, — для кабинета."""
        from datetime import date
        qs = (self.get_queryset()
              .filter(attendees__user=request.user, date__gte=date.today())
              .order_by("date"))
        return Response(self.get_serializer(qs, many=True).data)
