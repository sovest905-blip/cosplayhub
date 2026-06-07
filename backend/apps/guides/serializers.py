from rest_framework import serializers
from .models import Guide


class GuideSerializer(serializers.ModelSerializer):
    cover = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = Guide
        fields = ["id", "title", "summary", "body", "category", "cover", "is_published", "created_at"]
        read_only_fields = ["created_at"]
