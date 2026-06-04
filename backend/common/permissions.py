from rest_framework import permissions

class IsOwnerOrReadOnly(permissions.BasePermission):
    """Читать может любой, менять — только владелец объекта.
    Используется для профилей, образов, объявлений."""
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        owner = getattr(obj, "user", None) or getattr(obj, "owner", None)
        return owner == request.user
