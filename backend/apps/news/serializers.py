from rest_framework import serializers
from .models import News


class NewsSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    image = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = News
        fields = ["id", "title", "body", "image", "is_pinned", "is_published",
                  "author_name", "created_at"]
        read_only_fields = ["author_name", "created_at"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["image"] = instance.image.url if instance.image else None
        return data

    def get_author_name(self, obj):
        return obj.author.username if obj.author else ""
