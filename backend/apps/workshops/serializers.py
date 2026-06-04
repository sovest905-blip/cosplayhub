from rest_framework import serializers
from .models import Workshop, Service

class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = ["id", "name", "description", "price_from"]

class WorkshopSerializer(serializers.ModelSerializer):
    services = ServiceSerializer(many=True, read_only=True)
    class Meta:
        model = Workshop
        fields = ["id", "name", "type", "city", "about", "cover", "eta",
                  "rating", "orders_count", "is_pro", "services", "created_at"]
        read_only_fields = ["rating", "orders_count", "created_at"]
