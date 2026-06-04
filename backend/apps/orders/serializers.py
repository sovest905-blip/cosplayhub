from rest_framework import serializers
from .models import Order

class OrderSerializer(serializers.ModelSerializer):
    workshop_name = serializers.CharField(source="workshop.name", read_only=True)
    class Meta:
        model = Order
        fields = ["id", "workshop", "workshop_name", "description", "budget",
                  "deadline", "status", "created_at"]
        read_only_fields = ["status", "created_at"]
