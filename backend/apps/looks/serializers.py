from rest_framework import serializers
from .models import Look


class LookSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(required=False, allow_null=True)
    author_name = serializers.SerializerMethodField()
    author_id = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    team_name = serializers.SerializerMethodField()

    class Meta:
        model = Look
        fields = ["id", "title", "character", "description", "image", "is_published",
                  "author_name", "author_id", "team", "team_name",
                  "likes_count", "is_liked", "created_at"]
        read_only_fields = ["author_name", "author_id", "team_name", "likes_count", "is_liked", "created_at"]

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
