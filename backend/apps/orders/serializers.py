from rest_framework import serializers
from .models import Order

class OrderSerializer(serializers.ModelSerializer):
    workshop_name = serializers.CharField(source="workshop.name", read_only=True)
    class Meta:
        model = Order
        fields = ["id", "workshop", "workshop_name", "description", "budget",
                  "deadline", "status", "created_at"]
        read_only_fields = ["status", "created_at"]

class IncomingOrderSerializer(serializers.ModelSerializer):
    workshop_name = serializers.CharField(source="workshop.name", read_only=True)
    customer_username = serializers.CharField(source="customer.username", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    class Meta:
        model = Order
        fields = ["id", "workshop", "workshop_name", "customer_username",
                  "description", "budget", "deadline", "status", "status_display", "created_at"]
        read_only_fields = ["workshop", "customer_username", "description",
                            "budget", "deadline", "created_at"]
