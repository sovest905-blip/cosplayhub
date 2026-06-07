from rest_framework import serializers
from .models import Event

MONTHS_RU = ["", "янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"]


class EventSerializer(serializers.ModelSerializer):
    cover = serializers.ImageField(required=False, allow_null=True)
    day = serializers.SerializerMethodField()
    month = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = ["id", "title", "description", "city", "place", "date", "cover",
                  "going", "is_published", "day", "month", "created_at"]
        read_only_fields = ["day", "month", "created_at"]

    def get_day(self, obj):
        return obj.date.day if obj.date else ""

    def get_month(self, obj):
        return MONTHS_RU[obj.date.month] if obj.date else ""
