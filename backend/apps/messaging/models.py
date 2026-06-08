from django.conf import settings
from django.db import models


class Conversation(models.Model):
    """Диалог между двумя (или более) пользователями. Для 1-на-1 — два участника."""
    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="conversations"
    )
    # Если диалог начат по объявлению барахолки — помечаем его, чтобы не терялся.
    listing = models.ForeignKey(
        "listings.Listing", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="conversations",
    )
    listing_title = models.CharField(  # снимок названия — переживёт удаление объявления
        "объявление", max_length=120, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)  # время последнего сообщения — для сортировки

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"Диалог #{self.pk}"


class Message(models.Model):
    conversation = models.ForeignKey(
        Conversation, on_delete=models.CASCADE, related_name="messages"
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_messages"
    )
    text = models.TextField("текст")
    is_read = models.BooleanField("прочитано", default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"#{self.pk} от {self.sender_id}"
