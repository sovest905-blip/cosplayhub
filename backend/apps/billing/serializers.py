from rest_framework import serializers

from .models import Subscription, PLAN_PRICES


class SubscriptionSerializer(serializers.ModelSerializer):
    is_active = serializers.BooleanField(read_only=True)
    status = serializers.CharField(read_only=True)
    plan_display = serializers.CharField(source="get_plan_display", read_only=True)
    workshop_name = serializers.CharField(source="workshop.name", read_only=True, default=None)
    price = serializers.SerializerMethodField()

    class Meta:
        model = Subscription
        fields = ["id", "plan", "plan_display", "workshop", "workshop_name",
                  "source", "active_until", "disabled", "note", "is_active",
                  "status", "price", "started_at", "updated_at"]

    def get_price(self, obj):
        return PLAN_PRICES.get(obj.plan, 0)
