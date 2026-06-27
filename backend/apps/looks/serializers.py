from rest_framework import serializers
from .models import Look, LookUpdate


class LookUpdateSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    workshop_name = serializers.CharField(source="workshop.name", read_only=True, default=None)

    class Meta:
        model = LookUpdate
        fields = ["id", "text", "image", "workshop", "workshop_name", "created_at"]
        read_only_fields = ["created_at"]

    def get_image(self, obj):
        return obj.image.url if obj.image else None


class LookSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(required=False, allow_null=True)
    author_name = serializers.SerializerMethodField()
    author_id = serializers.SerializerMethodField()
    author_profile_id = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    team_name = serializers.SerializerMethodField()
    stage_display = serializers.CharField(source="get_stage_display", read_only=True)
    updates = serializers.SerializerMethodField()
    is_mine = serializers.SerializerMethodField()
    is_boosted = serializers.SerializerMethodField()

    class Meta:
        model = Look
        fields = ["id", "title", "character", "description", "image", "is_published",
                  "stage", "stage_display", "author_name", "author_id", "author_profile_id",
                  "team", "team_name", "likes_count", "is_liked", "updates", "is_mine",
                  "is_boosted", "created_at"]
        read_only_fields = ["author_name", "author_id", "author_profile_id", "team_name",
                            "likes_count", "is_liked", "stage_display", "updates", "is_mine",
                            "is_boosted", "created_at"]

    def get_is_boosted(self, obj):
        from django.utils import timezone
        return bool(obj.boosted_until and obj.boosted_until > timezone.now())

    def get_updates(self, obj):
        return LookUpdateSerializer(obj.updates.all(), many=True).data

    def get_is_mine(self, obj):
        request = self.context.get("request")
        return bool(request and request.user.is_authenticated and obj.author_id == request.user.id)

    def get_author_profile_id(self, obj):
        prof = getattr(obj.author, "profile", None) if obj.author else None
        return prof.id if prof else None

    def to_representation(self, instance):
        # Относительный URL картинки (/media/...): работает на любом origin —
        # и в браузере (IP:8080), и при SSR. Абсолютный (build_absolute_uri) ломался:
        # порт терялся (http://IP без :8080), а при SSR подставлялся http://web:8000.
        data = super().to_representation(instance)
        data["image"] = instance.image.url if instance.image else None
        return data

    def get_team_name(self, obj):
        return obj.team.name if obj.team else ""

    def validate_team(self, team):
        # Привязать образ можно только к своей команде (где ты участник).
        if team is None:
            return team
        request = self.context.get("request")
        user = request.user if request else None
        if not user or not team.members.filter(user=user, status="member").exists():
            raise serializers.ValidationError("Можно привязать только к своей команде")
        return team

    def get_author_name(self, obj):
        return obj.author.username if obj.author else ""

    def get_author_id(self, obj):
        return obj.author_id

    def get_likes_count(self, obj):
        return obj.likes.count()

    def get_is_liked(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return obj.likes.filter(user=request.user).exists()
