from django.conf import settings
from django.db import models

class Order(models.Model):
    """Заказ косплеера в мастерскую.
    ВАЖНО: на пилоте БЕЗ реальных платежей. Поле escrow_status —
    это статус-трекер, не движение денег. Деньги подключим после ТОО."""
    STATUS = [
        ("request", "Заявка"),     # косплеер отправил
        ("accepted", "Принят"),    # мастер согласился
        ("in_work", "В работе"),
        ("shipped", "Отправлен"),
        ("done", "Получен"),
        ("cancelled", "Отменён"),
    ]
    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                                 related_name="orders")
    workshop = models.ForeignKey("workshops.Workshop", on_delete=models.CASCADE,
                                 related_name="orders")
    description = models.TextField("что нужно")
    budget = models.PositiveIntegerField("бюджет, ₸", null=True, blank=True)
    deadline = models.DateField("дедлайн", null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS, default="request")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Заказ #{self.pk} → {self.workshop.name}"
