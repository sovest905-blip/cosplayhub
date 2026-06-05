from django.db.models import Count
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.backends import CsrfExemptSessionAuthentication
from apps.users.models import User
from apps.notifications.models import notify
from .models import Conversation, Message
from .serializers import ConversationSerializer, MessageSerializer


class ConversationListView(APIView):
    """GET — мои диалоги. POST {user: id} — начать/получить диалог с пользователем."""
    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def get(self, request):
        qs = (
            request.user.conversations
            .prefetch_related("participants", "messages")
            .all()
        )
        return Response(ConversationSerializer(qs, many=True, context={"request": request}).data)

    def post(self, request):
        other_id = request.data.get("user")
        if not other_id:
            return Response({"detail": "Укажите user"}, status=status.HTTP_400_BAD_REQUEST)
        if str(other_id) == str(request.user.id):
            return Response({"detail": "Нельзя писать самому себе"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            other = User.objects.get(pk=other_id)
        except User.DoesNotExist:
            return Response({"detail": "Пользователь не найден"}, status=status.HTTP_404_NOT_FOUND)

        # Ищем существующий 1-на-1 диалог с ровно этими двумя участниками
        conv = (
            Conversation.objects
            .filter(participants=request.user)
            .filter(participants=other)
            .annotate(n=Count("participants"))
            .filter(n=2)
            .first()
        )
        if not conv:
            conv = Conversation.objects.create()
            conv.participants.add(request.user, other)
        return Response(
            ConversationSerializer(conv, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class MessageListView(APIView):
    """GET — сообщения диалога (+ помечает входящие прочитанными). POST {text} — отправить."""
    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def _get_conv(self, request, pk):
        return Conversation.objects.filter(pk=pk, participants=request.user).first()

    def get(self, request, pk):
        conv = self._get_conv(request, pk)
        if not conv:
            return Response({"detail": "Не найдено"}, status=status.HTTP_404_NOT_FOUND)
        # входящие непрочитанные → прочитанные
        conv.messages.filter(is_read=False).exclude(sender=request.user).update(is_read=True)
        msgs = conv.messages.select_related("sender").all()
        return Response(MessageSerializer(msgs, many=True, context={"request": request}).data)

    def post(self, request, pk):
        conv = self._get_conv(request, pk)
        if not conv:
            return Response({"detail": "Не найдено"}, status=status.HTTP_404_NOT_FOUND)
        text = (request.data.get("text") or "").strip()
        if not text:
            return Response({"detail": "Пустое сообщение"}, status=status.HTTP_400_BAD_REQUEST)

        msg = Message.objects.create(conversation=conv, sender=request.user, text=text)
        conv.save(update_fields=["updated_at"])  # поднять диалог наверх

        # уведомить собеседника(ов)
        for p in conv.participants.exclude(id=request.user.id):
            notify(
                p, "message",
                f"Новое сообщение от @{request.user.username}",
                url="/messages",
            )
        return Response(
            MessageSerializer(msg, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class UnreadMessagesCountView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def get(self, request):
        count = (
            Message.objects
            .filter(conversation__participants=request.user, is_read=False)
            .exclude(sender=request.user)
            .count()
        )
        return Response({"count": count})
