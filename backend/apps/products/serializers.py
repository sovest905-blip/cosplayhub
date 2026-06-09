from rest_framework import serializers
from .models import Product


class ProductSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(required=False, allow_null=True)
    owner_name = serializers.SerializerMethodField()
    owner_id = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Product
        fields = ["id", "title", "description", "price", "image", "image_url", "category",
                  "status", "status_display", "is_active", "owner_name", "owner_id", "created_at"]
        read_only_fields = ["status_display", "owner_name", "owner_id", "created_at"]

    def to_representation(self, instance):
        # Относительный URL картинки (как в looks): работает на любом origin и при SSR.
        data = super().to_representation(instance)
        data["image"] = instance.image.url if instance.image else (instance.image_url or None)
        return data

    def get_owner_name(self, obj):
        return obj.owner.username if obj.owner else ""

    def get_owner_id(self, obj):
        return obj.owner_id
