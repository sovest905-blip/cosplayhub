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
    is_verified = serializers.SerializerMethodField()
    username = serializers.CharField(source="user.username", read_only=True, default="")
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    followers_count = serializers.SerializerMethodField()
    looks_count = serializers.SerializerMethodField()
    is_following = serializers.SerializerMethodField()
    pinned_looks = serializers.SerializerMethodField()
    donations = serializers.SerializerMethodField()
    mascot = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = ["id", "user_id", "display_name", "username", "bio", "roles", "role_details",
                  "avatar", "cover", "available_for_work", "experience", "rating", "accent_color",
                  "slug", "pinned_looks", "donations", "mascot", "city", "is_verified", "socials", "photos",
                  "followers_count", "looks_count", "is_following", "created_at"]
        read_only_fields = ["rating", "slug", "created_at"]

    def get_donations(self, obj):
        # Кнопка «Поддержать» только у активного Pro (фан-монетизация — фишка Pro).
        if not obj.user_id:
            return []
        pro = getattr(obj, "pro_active", None)
        if pro is None:
            pro = obj.user.is_pro
        return (obj.donation_methods or []) if pro else []

    def get_mascot(self, obj):
        # Маскот-компаньон — только у активного Pro (Pro-льгота).
        if not obj.user_id:
            return ""
        pro = getattr(obj, "pro_active", None)
        if pro is None:
            pro = obj.user.is_pro
        return (obj.mascot or "") if pro else ""

    def get_pinned_looks(self, obj):
        ids = obj.pinned_look_ids or []
        if not ids or not obj.user_id:
            return []
        from apps.looks.models import Look
        looks = {l.id: l for l in Look.objects.filter(id__in=ids, author_id=obj.user_id, is_published=True)}
        out = []
        for i in ids:  # сохраняем порядок закрепления
            l = looks.get(i)
            if l:
                out.append({"id": l.id, "title": l.title, "character": l.character,
                            "image": l.image.url if l.image else None})
        return out

    def to_representation(self, instance):
        # Относительные URL медиа (/media/...): корректны и в браузере, и при SSR.
        # Абсолютные (build_absolute_uri) теряли порт :8080 / подставляли web:8000.
        data = super().to_representation(instance)
        data["avatar"] = instance.avatar.url if instance.avatar else None
        data["cover"] = instance.cover.url if instance.cover else None
        # Роль-специфичные лого/обложки: {role: {logo, cover}}. Фолбэк на avatar/cover — на фронте.
        data["role_media"] = {
            m.role: {
                "logo": m.logo.url if m.logo else None,
                "cover": m.cover.url if m.cover else None,
            }
            for m in instance.role_media.all()
        }
        return data

    def get_is_verified(self, obj):
        # Синяя галочка = ручная верификация ИЛИ активный Pro (льгота подписки).
        # pro_active приходит аннотацией из каталога (без N+1); иначе — свойство User.
        if not obj.user_id:
            return False
        pro = getattr(obj, "pro_active", None)
        if pro is None:
            pro = obj.user.is_pro
        return bool(obj.user.is_verified or pro)

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
