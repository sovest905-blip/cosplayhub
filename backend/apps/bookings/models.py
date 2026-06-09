from django.conf import settings
from django.db import models


class Slot(models.Model):
    """Слот аренды локации: дата + время + цена. Создаёт владелец профиля с ролью «локация».

    Денег нет (до ТОО): бронь = заявка → подтверждение владельцем, оплата на месте/в ЛС.
    """
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="slots")
    title = models.CharField("название", max_length=120, blank=True)  # «Зал А», «вечерний» (опц.)
    date = models.DateField("дата")
    time_start = models.TimeField("начало")
    time_end = models.TimeField("конец")
    price = models.PositiveIntegerField("цена ₸", null=True, blank=True)  # NULL = договорная
    is_active = models.BooleanField("активен", default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["date", "time_start"]
        verbose_name = "слот аренды"
        verbose_name_plural = "слоты аренды"

    @property
    def is_booked(self) -> bool:
        return self.bookings.filter(status="approved").exists()

    def __str__(self):
        return f"{self.date} {self.time_start}–{self.time_end} ({self.owner_id})"


class Booking(models.Model):
    """Заявка на слот. pending → approved/declined владельцем; cancelled — отменил сам гость."""
    STATUS_CHOICES = [
        ("pending",   "Заявка"),
        ("approved",  "Подтверждена"),
        ("declined",  "Отклонена"),
        ("cancelled", "Отменена"),
    ]
    slot = models.ForeignKey(Slot, on_delete=models.CASCADE, related_name="bookings")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="bookings")
    status = models.CharField("статус", max_length=12, choices=STATUS_CHOICES, default="pending")
    comment = models.CharField("комментарий", max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "бронь"
        verbose_name_plural = "брони"

    def __str__(self):
        return f"{self.user_id} → слот {self.slot_id} ({self.status})"
