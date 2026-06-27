from rest_framework import serializers

from .models import Shoot, ShootParticipant

ROLE_RU = dict(Shoot.ROLE_CHOICES)
PART_STATUS_RU = dict(ShootParticipant.STATUS_CHOICES)


def _user_mini(user, role=None, status=None, part_id=None, comment=""):
    prof = getattr(user, "profile", None)
    return {
        "id": part_id,
        "user_id": user.id,
        "profile_id": prof.id if prof else None,
        "username": (prof.display_name if prof else None) or user.username,
        "avatar": prof.avatar.url if (prof and prof.avatar) else None,
        "role": role,
        "role_display": ROLE_RU.get(role, role),
        "status": status,
        "status_display": PART_STATUS_RU.get(status, status),
        "comment": comment,
    }


class ShootSerializer(serializers.ModelSerializer):
    organizer_id = serializers.IntegerField(read_only=True)
    organizer = serializers.SerializerMethodField()
    location_name = serializers.SerializerMethodField()
    location_profile_id = serializers.SerializerMethodField()
    workshop_name = serializers.CharField(source="workshop.name", read_only=True, default=None)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    cover = serializers.SerializerMethodField()
    participants = serializers.SerializerMethodField()  # подтверждённые — всем
    requests = serializers.SerializerMethodField()      # заявки/инвайты — только организатору/staff
    confirmed_count = serializers.SerializerMethodField()
    is_organizer = serializers.SerializerMethodField()
    my_participation = serializers.SerializerMethodField()

    class Meta:
        model = Shoot
        fields = ["id", "title", "description", "city", "date", "looking_for", "status",
                  "status_display", "cover", "is_active", "created_at",
                  "organizer_id", "organizer", "location", "location_name", "location_profile_id",
                  "workshop", "workshop_name", "participants", "requests", "confirmed_count",
                  "is_organizer", "my_participation"]
        read_only_fields = ["organizer_id", "is_active", "created_at"]

    def _user(self):
        request = self.context.get("request")
        return request.user if request and request.user.is_authenticated else None

    def get_organizer(self, obj):
        return _user_mini(obj.organizer)

    def get_location_name(self, obj):
        if not obj.location:
            return None
        prof = getattr(obj.location, "profile", None)
        return (prof.display_name if prof else None) or obj.location.username

    def get_location_profile_id(self, obj):
        prof = getattr(obj.location, "profile", None) if obj.location else None
        return prof.id if prof else None

    def get_cover(self, obj):
        return obj.cover.url if obj.cover else None

    def get_confirmed_count(self, obj):
        return sum(1 for p in obj.participants.all() if p.status == "confirmed")

    def get_participants(self, obj):
        return [_user_mini(p.user, p.role, p.status, p.id, p.comment)
                for p in obj.participants.all() if p.status == "confirmed"]

    def get_requests(self, obj):
        user = self._user()
        if not user or (not user.is_staff and obj.organizer_id != user.id):
            return None
        return [_user_mini(p.user, p.role, p.status, p.id, p.comment)
                for p in obj.participants.all() if p.status in ("requested", "invited")]

    def get_is_organizer(self, obj):
        user = self._user()
        return bool(user and obj.organizer_id == user.id)

    def get_my_participation(self, obj):
        user = self._user()
        if not user:
            return None
        for p in obj.participants.all():
            if p.user_id == user.id:
                return {"status": p.status, "role": p.role}
        return None
