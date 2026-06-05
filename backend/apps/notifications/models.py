from django.conf import settings
from django.db import models


class Notification(models.Model):
    """Уведомление пользователю. Создаётся через helper notify()."""
    KIND_CHOICES = [
        ("message", "Сообщение"),
        ("order_new", "Новый заказ"),
        ("order_status", "Статус заказа"),
        ("system", "Системное"),
    ]
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications"
    )
    kind = models.CharField(max_length=20, choices=KIND_CHOICES, default="system")
    text = models.CharField("текст", max_length=255)
    url = models.CharField("ссылка", max_length=255, blank=True)
    is_read = models.BooleanField("прочитано", default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_kind_display()} → {self.recipient_id}"


def notify(recipient, kind, text, url=""):
    """Создать уведомление. recipient — User. Безопасно вызывать откуда угодно."""
    if recipient is None:
        return None
    return Notification.objects.create(
        recipient=recipient, kind=kind, text=text[:255], url=url[:255]
    )
