from rest_framework import serializers
from .models import Profile, SocialLink

class SocialLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = SocialLink
        fields = ["id", "platform", "handle", "is_connected"]

class ProfileSerializer(serializers.ModelSerializer):
    socials = SocialLinkSerializer(many=True, read_only=True)
    class Meta:
        model = Profile
        fields = ["id", "display_name", "bio", "roles", "avatar", "cover",
                  "available_for_work", "experience", "rating",
                  "accent_color", "socials", "created_at"]
        read_only_fields = ["rating", "created_at"]
