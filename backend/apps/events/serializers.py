from rest_framework import serializers
from .models import Event

MONTHS_RU = ["", "янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"]


class EventSerializer(serializers.ModelSerializer):
    cover = serializers.ImageField(required=False, allow_null=True)
    day = serializers.SerializerMethodField()
    month = serializers.SerializerMethodField()
    going_total = serializers.SerializerMethodField()
    is_going = serializers.SerializerMethodField()
    attendees = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = ["id", "title", "description", "city", "place", "date", "cover",
                  "going", "going_total", "is_going", "attendees",
                  "is_published", "day", "month", "created_at"]
        read_only_fields = ["day", "month", "going_total", "is_going", "attendees", "created_at"]

    def get_going_total(self, obj):
        # going — ручной счётчик из админки (затравка), плюс реальные отметки «Пойду»
        return obj.going + obj.attendees.count()

    def get_is_going(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return obj.attendees.filter(user=request.user).exists()

    def get_attendees(self, obj):
        qs = obj.attendees.select_related("user").order_by("-created_at")[:12]
        return [{"user_id": a.user_id, "username": a.user.username} for a in qs]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["cover"] = instance.cover.url if instance.cover else None
        return data

    def get_day(self, obj):
        return obj.date.day if obj.date else ""

    def get_month(self, obj):
        return MONTHS_RU[obj.date.month] if obj.date else ""
