from rest_framework import serializers

from .models import Battle, BattleEntry

STATUS_RU = {"upcoming": "Скоро", "voting": "Идёт голосование", "finished": "Завершён"}


def _entry_dict(entry, my_vote_entry_id=None):
    look = entry.look
    prof = getattr(entry.user, "profile", None) if entry.user else None
    return {
        "id": entry.id,
        "look_id": look.id if look else None,
        "title": look.title if look else "",
        "character": look.character if look else "",
        "image": look.image.url if (look and look.image) else None,
        "author_name": (prof.display_name if prof else None) or (entry.user.username if entry.user else "—"),
        "author_profile_id": prof.id if prof else None,
        "votes_count": entry.votes_count if hasattr(entry, "votes_count") else entry.votes.count(),
        "is_mine_vote": entry.id == my_vote_entry_id,
    }


class BattleSerializer(serializers.ModelSerializer):
    status = serializers.CharField(read_only=True)
    status_display = serializers.SerializerMethodField()
    cover = serializers.SerializerMethodField()
    can_vote = serializers.BooleanField(read_only=True)
    can_enter = serializers.BooleanField(read_only=True)
    entries_count = serializers.SerializerMethodField()
    entries = serializers.SerializerMethodField()      # лидерборд (по голосам)
    my_vote = serializers.SerializerMethodField()       # entry_id, за который я голосовал
    my_entry = serializers.SerializerMethodField()      # entry_id моей заявки
    is_creator = serializers.SerializerMethodField()

    class Meta:
        model = Battle
        fields = ["id", "title", "theme", "description", "cover", "starts_at", "ends_at",
                  "is_active", "created_at", "status", "status_display", "can_vote", "can_enter",
                  "entries_count", "entries", "my_vote", "my_entry", "is_creator"]
        read_only_fields = ["is_active", "created_at"]

    def _user(self):
        request = self.context.get("request")
        return request.user if request and request.user.is_authenticated else None

    def get_status_display(self, obj):
        return STATUS_RU.get(obj.status, obj.status)

    def get_cover(self, obj):
        return obj.cover.url if obj.cover else None

    def get_entries_count(self, obj):
        return obj.entries.count()

    def _my_vote_entry_id(self, obj):
        user = self._user()
        if not user:
            return None
        for v in obj.votes.all():
            if v.user_id == user.id:
                return v.entry_id
        return None

    def get_entries(self, obj):
        mv = self._my_vote_entry_id(obj)
        rows = [_entry_dict(e, mv) for e in obj.entries.all()]
        rows.sort(key=lambda r: -r["votes_count"])  # лидерборд
        return rows

    def get_my_vote(self, obj):
        return self._my_vote_entry_id(obj)

    def get_my_entry(self, obj):
        user = self._user()
        if not user:
            return None
        for e in obj.entries.all():
            if e.user_id == user.id:
                return e.id
        return None

    def get_is_creator(self, obj):
        user = self._user()
        return bool(user and (user.is_staff or obj.created_by_id == user.id))
