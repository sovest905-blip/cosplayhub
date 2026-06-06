from rest_framework import viewsets
from rest_framework.permissions import AllowAny, IsAdminUser

from apps.users.backends import CsrfExemptSessionAuthentication
from .models import News
from .serializers import NewsSerializer


class NewsViewSet(viewsets.ModelViewSet):
    """Новости: читают все, создаёт/правит/удаляет только staff (админ)."""
    serializer_class = NewsSerializer
    authentication_classes = [CsrfExemptSessionAuthentication]

    def get_queryset(self):
        qs = News.objects.all()
        # Гостям и обычным юзерам — только опубликованные.
        if not (self.request.user.is_authenticated and self.request.user.is_staff):
            qs = qs.filter(is_published=True)
        return qs

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        return [IsAdminUser()]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)
