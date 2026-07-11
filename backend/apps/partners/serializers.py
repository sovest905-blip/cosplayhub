from rest_framework import serializers

from .models import Partner


class PartnerSerializer(serializers.ModelSerializer):
    logo = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = Partner
        fields = ["id", "name", "url", "logo", "logo_url", "tier", "card_text",
                  "show_strip", "show_feed", "is_active", "order", "created_at"]
        read_only_fields = ["created_at"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Загруженный файл приоритетнее ссылки (как в products/curated).
        data["logo"] = instance.logo.url if instance.logo else (instance.logo_url or None)
        return data
