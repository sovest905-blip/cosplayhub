from rest_framework import serializers
from .models import Profile, SocialLink

class SocialLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = SocialLink
        fields = ["id", "platform", "handle", "is_connected"]

class ProfileSerializer(serializers.ModelSerializer):
    socials = SocialLinkSerializer(many=True, read_only=True)
    city = serializers.CharField(source="user.city", read_only=True, default="")
    is_verified = serializers.BooleanField(source="user.is_verified", read_only=True, default=False)
    username = serializers.CharField(source="user.username", read_only=True, default="")
    user_id = serializers.IntegerField(source="user.id", read_only=True)

    class Meta:
        model = Profile
        fields = ["id", "user_id", "display_name", "username", "bio", "roles", "avatar", "cover",
                  "available_for_work", "experience", "rating", "accent_color",
                  "city", "is_verified", "socials", "created_at"]
        read_only_fields = ["rating", "created_at"]
