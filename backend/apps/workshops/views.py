from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from apps.users.backends import CsrfExemptSessionAuthentication
from common.permissions import IsOwnerOrReadOnly
from .models import Workshop
from .serializers import WorkshopSerializer

class WorkshopViewSet(viewsets.ModelViewSet):
    queryset = Workshop.objects.all().prefetch_related("services").order_by("-created_at")
    serializer_class = WorkshopSerializer
    permission_classes = [AllowAny, IsOwnerOrReadOnly]
    authentication_classes = [CsrfExemptSessionAuthentication]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["type", "city"]  # is_pro теперь вычисляемое (billing), не фильтруется в БД

    def get_permissions(self):
        if self.action in ("create", "mine"):
            return [IsAuthenticated()]
        return super().get_permissions()

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=False, methods=["get"])
    def mine(self, request):
        """Мастерские текущего пользователя."""
        qs = self.get_queryset().filter(owner=request.user)
        ser = self.get_serializer(qs, many=True)
        return Response(ser.data)
