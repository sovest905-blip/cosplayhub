from rest_framework import serializers

from .models import Booking, Slot


class SlotSerializer(serializers.ModelSerializer):
    owner_id = serializers.IntegerField(read_only=True)
    owner_name = serializers.SerializerMethodField()
    is_booked = serializers.SerializerMethodField()
    my_booking = serializers.SerializerMethodField()   # статус заявки текущего юзера (или null)
    requests = serializers.SerializerMethodField()     # заявки — только владельцу/staff

    class Meta:
        model = Slot
        fields = ["id", "title", "date", "time_start", "time_end", "price", "is_active",
                  "owner_id", "owner_name", "is_booked", "my_booking", "requests", "created_at"]
        read_only_fields = ["owner_id", "owner_name", "is_booked", "my_booking", "requests", "created_at"]

    def get_owner_name(self, obj):
        return obj.owner.username if obj.owner else ""

    def get_is_booked(self, obj):
        return any(b.status == "approved" for b in obj.bookings.all())

    def _request_user(self):
        request = self.context.get("request")
        return request.user if request and request.user.is_authenticated else None

    def get_my_booking(self, obj):
        user = self._request_user()
        if not user:
            return None
        # Свежая не-отменённая заявка юзера на этот слот
        for b in obj.bookings.all():  # bookings prefetched, ordering -created_at
            if b.user_id == user.id and b.status != "cancelled":
                return b.status
        return None

    def get_requests(self, obj):
        user = self._request_user()
        if not user or (not user.is_staff and obj.owner_id != user.id):
            return None
        return [{
            "id": b.id,
            "user_id": b.user_id,
            "username": b.user.username,
            "status": b.status,
            "comment": b.comment,
            "created_at": b.created_at,
        } for b in obj.bookings.all()]


class MyBookingSerializer(serializers.ModelSerializer):
    """Брони текущего юзера (как гостя) со встроенным слотом."""
    slot = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Booking
        fields = ["id", "status", "status_display", "comment", "slot", "created_at"]

    def get_slot(self, obj):
        s = obj.slot
        prof = getattr(s.owner, "profile", None)
        return {
            "id": s.id, "title": s.title, "date": s.date,
            "time_start": s.time_start, "time_end": s.time_end, "price": s.price,
            "owner_id": s.owner_id,
            "owner_name": s.owner.username if s.owner else "",
            "owner_profile_id": prof.id if prof else None,  # ссылка /people/<profile_id>
        }
