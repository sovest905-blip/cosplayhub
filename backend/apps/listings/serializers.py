from rest_framework import serializers
from .models import Listing


class ListingSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = Listing
        fields = ["id", "title", "description", "type", "city", "price",
                  "contact", "is_active", "owner_username", "created_at"]
        read_only_fields = ["created_at", "owner_username"]
