from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from apps.users.backends import CsrfExemptSessionAuthentication
from common.permissions import IsOwnerOrReadOnly
from .models import Workshop, WorkshopPhoto
from .serializers import WorkshopSerializer

MAX_PHOTOS = 5

class WorkshopViewSet(viewsets.ModelViewSet):
    queryset = Workshop.objects.all().prefetch_related("services").order_by("-created_at")
    serializer_class = WorkshopSerializer
    permission_classes = [AllowAny, IsOwnerOrReadOnly]
    authentication_classes = [CsrfExemptSessionAuthentication]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["type", "city"]  # is_pro теперь вычисляемое (billing), не фильтруется в БД

    def get_queryset(self):
        # Pro-мастерские выше в каталоге (льгота «Boost в каталоге услуг»).
        from apps.billing.models import active_workshop_subquery
        return (Workshop.objects.all().prefetch_related("services")
                .annotate(pro_active=active_workshop_subquery())
                .order_by("-pro_active", "-created_at"))

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

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated],
            parser_classes=[MultiPartParser, FormParser])
    def photos(self, request, pk=None):
        """Загрузка фото работ (только владелец, максимум 5)."""
        workshop = self.get_object()
        if workshop.owner_id != request.user.id:
            return Response({"detail": "Не ваша мастерская"}, status=status.HTTP_403_FORBIDDEN)
        if workshop.photos.count() >= MAX_PHOTOS:
            return Response({"detail": f"Максимум {MAX_PHOTOS} фото"}, status=status.HTTP_400_BAD_REQUEST)
        image = request.FILES.get("image")
        if not image:
            return Response({"detail": "Файл не передан"}, status=status.HTTP_400_BAD_REQUEST)
        photo = WorkshopPhoto.objects.create(workshop=workshop, image=image)
        return Response({"id": photo.id, "url": photo.image.url}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], url_path=r"photos/(?P<photo_id>\d+)",
            permission_classes=[IsAuthenticated])
    def delete_photo(self, request, pk=None, photo_id=None):
        """Удаление фото работ (только владелец)."""
        workshop = self.get_object()
        if workshop.owner_id != request.user.id:
            return Response({"detail": "Не ваша мастерская"}, status=status.HTTP_403_FORBIDDEN)
        WorkshopPhoto.objects.filter(workshop=workshop, id=photo_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get"], permission_classes=[AllowAny])
    def reviews(self, request, pk=None):
        """Публичный список отзывов мастерской."""
        from apps.orders.serializers import ReviewSerializer
        workshop = self.get_object()
        qs = workshop.reviews.select_related("author")
        return Response(ReviewSerializer(qs, many=True).data)
