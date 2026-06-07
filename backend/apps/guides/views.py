from rest_framework import viewsets
from rest_framework.permissions import AllowAny, BasePermission, IsAuthenticated, SAFE_METHODS

from apps.users.backends import CsrfExemptSessionAuthentication
from .models import Guide
from .serializers import GuideSerializer


class IsAuthorOrStaffOrReadOnly(BasePermission):
    """Читать — все; менять/удалять — автор или staff."""
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user and (request.user.is_staff or obj.author_id == request.user.id))


class GuideViewSet(viewsets.ModelViewSet):
    """Гайды: читают все; пишет любой залогиненный; правит/удаляет автор или staff."""
    serializer_class = GuideSerializer
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthorOrStaffOrReadOnly]

    def get_queryset(self):
        qs = Guide.objects.select_related("author")
        user = self.request.user
        if self.request.query_params.get("mine") and user.is_authenticated:
            return qs.filter(author=user)
        if user.is_authenticated and user.is_staff:
            return qs
        if user.is_authenticated:
            from django.db.models import Q
            return qs.filter(Q(is_published=True) | Q(author=user))
        return qs.filter(is_published=True)

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        if self.action == "create":
            return [IsAuthenticated()]
        return [IsAuthorOrStaffOrReadOnly()]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)
