from rest_framework import serializers

from .models import Costume, RentalRequest

STATUS_RU = dict(RentalRequest.STATUS_CHOICES)


class CostumeSerializer(serializers.ModelSerializer):
    owner_id = serializers.IntegerField(read_only=True)
    owner_name = serializers.SerializerMethodField()
    owner_profile_id = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    image = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()
    my_request = serializers.SerializerMethodField()       # статус моей заявки (или null)
    requests = serializers.SerializerMethodField()         # заявки — только владельцу/staff

    class Meta:
        model = Costume
        fields = ["id", "title", "character", "description", "size", "price_day", "deposit",
                  "city", "image", "status", "status_display", "is_active", "created_at",
                  "owner_id", "owner_name", "owner_profile_id", "is_owner", "my_request", "requests"]
        read_only_fields = ["owner_id", "is_active", "created_at", "status_display"]

    def _user(self):
        request = self.context.get("request")
        return request.user if request and request.user.is_authenticated else None

    def get_owner_name(self, obj):
        prof = getattr(obj.owner, "profile", None)
        return (prof.display_name if prof else None) or obj.owner.username

    def get_owner_profile_id(self, obj):
        prof = getattr(obj.owner, "profile", None)
        return prof.id if prof else None

    def get_image(self, obj):
        return obj.image.url if obj.image else None

    def get_is_owner(self, obj):
        user = self._user()
        return bool(user and obj.owner_id == user.id)

    def get_my_request(self, obj):
        user = self._user()
        if not user:
            return None
        for r in obj.requests.all():
            if r.user_id == user.id and r.status in ("pending", "approved"):
                return r.status
        return None

    def get_requests(self, obj):
        user = self._user()
        if not user or (not user.is_staff and obj.owner_id != user.id):
            return None
        return [{
            "id": r.id,
            "user_id": r.user_id,
            "username": getattr(getattr(r.user, "profile", None), "display_name", None) or r.user.username,
            "profile_id": getattr(getattr(r.user, "profile", None), "id", None),
            "date_from": r.date_from,
            "date_to": r.date_to,
            "comment": r.comment,
            "status": r.status,
            "status_display": STATUS_RU.get(r.status, r.status),
        } for r in obj.requests.all()]


class MyRentalSerializer(serializers.ModelSerializer):
    """Мои заявки на аренду (как арендатора) со встроенным костюмом."""
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    costume = serializers.SerializerMethodField()

    class Meta:
        model = RentalRequest
        fields = ["id", "status", "status_display", "date_from", "date_to", "comment", "costume", "created_at"]

    def get_costume(self, obj):
        c = obj.costume
        return {
            "id": c.id, "title": c.title, "image": c.image.url if c.image else None,
            "price_day": c.price_day, "owner_name": c.owner.username if c.owner else "",
        }
