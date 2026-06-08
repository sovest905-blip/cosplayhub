from rest_framework import serializers
from .models import Conversation, Message


class MessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source="sender.username", read_only=True)
    is_mine = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ["id", "text", "sender", "sender_username", "is_mine", "is_read", "created_at"]
        read_only_fields = ["sender", "is_read", "created_at"]

    def get_is_mine(self, obj):
        request = self.context.get("request")
        return bool(request and obj.sender_id == request.user.id)


class ConversationSerializer(serializers.ModelSerializer):
    """Список диалогов: собеседник + последнее сообщение + непрочитанные."""
    other = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread = serializers.SerializerMethodField()
    listing = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ["id", "other", "last_message", "unread", "listing", "updated_at"]

    def get_listing(self, obj):
        if not obj.listing_id and not obj.listing_title:
            return None
        return {
            # id есть, только если объявление ещё не удалено
            "id": obj.listing_id,
            "title": obj.listing_title or (obj.listing.title if obj.listing else ""),
        }

    def _other_user(self, obj):
        request = self.context.get("request")
        me_id = request.user.id if request else None
        for p in obj.participants.all():
            if p.id != me_id:
                return p
        return None

    def get_other(self, obj):
        u = self._other_user(obj)
        if not u:
            return None
        prof = getattr(u, "profile", None)
        return {
            "user_id": u.id,
            "username": u.username,
            "avatar": prof.avatar.url if prof and prof.avatar else None,
        }

    def get_last_message(self, obj):
        msg = obj.messages.order_by("-created_at").first()
        if not msg:
            return None
        return {"text": msg.text, "created_at": msg.created_at, "sender_id": msg.sender_id}

    def get_unread(self, obj):
        request = self.context.get("request")
        me_id = request.user.id if request else None
        return obj.messages.filter(is_read=False).exclude(sender_id=me_id).count()
