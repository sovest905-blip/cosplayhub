from rest_framework import serializers
from .models import Moodboard, MoodboardItem


def _item_url(item):
    if item.image:
        return item.image.url
    return item.image_url or None


class MoodboardItemSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = MoodboardItem
        fields = ["id", "url", "image_url", "caption", "price"]

    def get_url(self, obj):
        return _item_url(obj)


class MoodboardListSerializer(serializers.ModelSerializer):
    owner_name = serializers.SerializerMethodField()
    items_count = serializers.SerializerMethodField()
    cover_url = serializers.SerializerMethodField()

    class Meta:
        model = Moodboard
        fields = ["id", "title", "owner_name", "items_count", "cover_url", "is_public", "is_active", "created_at"]

    def get_owner_name(self, obj):
        return obj.owner.username if obj.owner else ""

    def get_items_count(self, obj):
        return obj.items.count()

    def get_cover_url(self, obj):
        if obj.cover:
            return obj.cover.url
        first = obj.items.first()
        return _item_url(first) if first else None


class MoodboardDetailSerializer(serializers.ModelSerializer):
    cover = serializers.ImageField(required=False, allow_null=True)
    owner_name = serializers.SerializerMethodField()
    owner_id = serializers.SerializerMethodField()
    items = MoodboardItemSerializer(many=True, read_only=True)
    can_edit = serializers.SerializerMethodField()

    class Meta:
        model = Moodboard
        fields = ["id", "title", "description", "cover", "is_public", "is_active",
                  "owner_name", "owner_id", "items", "can_edit", "created_at"]
        read_only_fields = ["created_at"]

    def get_owner_name(self, obj):
        return obj.owner.username if obj.owner else ""

    def get_owner_id(self, obj):
        return obj.owner_id

    def get_can_edit(self, obj):
        request = self.context.get("request")
        u = request.user if request else None
        return bool(u and u.is_authenticated and (u.is_staff or u.id == obj.owner_id))
