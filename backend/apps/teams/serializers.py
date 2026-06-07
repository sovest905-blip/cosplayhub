from rest_framework import serializers
from .models import Team


def _avatar_url(user):
    prof = getattr(user, "profile", None)
    return prof.avatar.url if prof and prof.avatar else None


class TeamListSerializer(serializers.ModelSerializer):
    members_count = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    captain_name = serializers.SerializerMethodField()

    class Meta:
        model = Team
        fields = ["id", "name", "city", "avatar", "cover", "is_open", "is_active",
                  "captain_name", "members_count", "likes_count", "created_at"]

    def get_members_count(self, obj):
        return obj.members.filter(status="member").count()

    def get_likes_count(self, obj):
        return obj.likes.count()

    def get_captain_name(self, obj):
        return obj.captain.username if obj.captain else ""


class TeamDetailSerializer(serializers.ModelSerializer):
    avatar = serializers.ImageField(required=False, allow_null=True)
    cover = serializers.ImageField(required=False, allow_null=True)
    captain_name = serializers.SerializerMethodField()
    captain_id = serializers.SerializerMethodField()
    members = serializers.SerializerMethodField()
    pending = serializers.SerializerMethodField()
    members_count = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    my_status = serializers.SerializerMethodField()
    events = serializers.SerializerMethodField()
    looks = serializers.SerializerMethodField()

    class Meta:
        model = Team
        fields = ["id", "name", "city", "about", "avatar", "cover", "is_open", "is_active",
                  "instagram", "tiktok", "contact", "captain_name", "captain_id",
                  "members", "pending", "members_count", "likes_count", "is_liked",
                  "my_status", "events", "looks", "created_at"]
        read_only_fields = ["created_at"]

    def get_captain_name(self, obj):
        return obj.captain.username if obj.captain else ""

    def get_captain_id(self, obj):
        return obj.captain_id

    def _member_dict(self, m):
        return {"user_id": m.user_id, "username": m.user.username if m.user else "",
                "avatar": _avatar_url(m.user) if m.user else None,
                "role_in_team": m.role_in_team, "status": m.status,
                "is_captain": m.user_id == m.team.captain_id}

    def get_members(self, obj):
        return [self._member_dict(m) for m in obj.members.select_related("user__profile").filter(status="member")]

    def get_pending(self, obj):
        # Заявки видит только капитан/staff
        request = self.context.get("request")
        u = request.user if request else None
        if not (u and u.is_authenticated and (u.is_staff or u.id == obj.captain_id)):
            return []
        return [self._member_dict(m) for m in obj.members.select_related("user__profile").filter(status="pending")]

    def get_members_count(self, obj):
        return obj.members.filter(status="member").count()

    def get_likes_count(self, obj):
        return obj.likes.count()

    def get_is_liked(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return obj.likes.filter(user=request.user).exists()

    def get_my_status(self, obj):
        request = self.context.get("request")
        u = request.user if request else None
        if not u or not u.is_authenticated:
            return "guest"
        if u.id == obj.captain_id:
            return "captain"
        m = obj.members.filter(user=u).first()
        return m.status if m else "none"

    def get_events(self, obj):
        from apps.events.serializers import EventSerializer
        return EventSerializer(obj.events.all(), many=True, context=self.context).data

    def get_looks(self, obj):
        from apps.looks.serializers import LookSerializer
        qs = obj.looks.filter(is_published=True).select_related("author")[:12]
        return LookSerializer(qs, many=True, context=self.context).data
