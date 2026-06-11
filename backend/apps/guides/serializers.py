from rest_framework import serializers
from .models import Guide


class GuideSerializer(serializers.ModelSerializer):
    cover = serializers.ImageField(required=False, allow_null=True)
    author_name = serializers.SerializerMethodField()
    author_id = serializers.SerializerMethodField()
    photos = serializers.SerializerMethodField()

    class Meta:
        model = Guide
        fields = ["id", "title", "summary", "body", "category", "cover", "is_published",
                  "author_name", "author_id", "photos", "created_at"]
        read_only_fields = ["author_name", "author_id", "photos", "created_at"]

    def get_photos(self, obj):
        return [{"id": p.id, "url": p.image.url} for p in obj.photos.all()]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["cover"] = instance.cover.url if instance.cover else None
        return data

    def get_author_name(self, obj):
        return obj.author.username if obj.author else ""

    def get_author_id(self, obj):
        return obj.author_id
