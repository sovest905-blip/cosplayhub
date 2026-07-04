from rest_framework import serializers

from .models import CuratedPick, Category


class CuratedPickSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = CuratedPick
        fields = ["id", "style", "tag", "title", "meta", "link",
                  "image", "image_url", "order", "is_active", "created_at"]
        read_only_fields = ["created_at"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Итоговая картинка для показа: загруженный файл приоритетнее ссылки.
        data["image"] = instance.image.url if instance.image else (instance.image_url or None)
        return data


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "label", "link", "order", "is_active"]
