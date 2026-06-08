from rest_framework import serializers
from .models import Profile, SocialLink, ProfilePhoto

class SocialLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = SocialLink
        fields = ["id", "platform", "handle", "is_connected"]

class ProfilePhotoSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = ProfilePhoto
        fields = ["id", "url"]

    def get_url(self, obj):
        return obj.image.url if obj.image else None

class ProfileSerializer(serializers.ModelSerializer):
    socials = SocialLinkSerializer(many=True, read_only=True)
    photos = ProfilePhotoSerializer(many=True, read_only=True)
    city = serializers.CharField(source="user.city", read_only=True, default="")
    is_verified = serializers.BooleanField(source="user.is_verified", read_only=True, default=False)
    username = serializers.CharField(source="user.username", read_only=True, default="")
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    followers_count = serializers.SerializerMethodField()
    looks_count = serializers.SerializerMethodField()
    is_following = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = ["id", "user_id", "display_name", "username", "bio", "roles", "role_details",
                  "avatar", "cover", "available_for_work", "experience", "rating", "accent_color",
                  "city", "is_verified", "socials", "photos", "followers_count", "looks_count",
                  "is_following", "created_at"]
        read_only_fields = ["rating", "created_at"]

    def get_followers_count(self, obj):
        return obj.user.follower_set.count()

    def get_looks_count(self, obj):
        return obj.user.looks.filter(is_published=True).count()

    def get_is_following(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        from .models import Follow
        return Follow.objects.filter(follower=request.user, target=obj.user).exists()
