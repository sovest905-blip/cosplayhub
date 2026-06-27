from django.conf import settings
from django.db import models


class Costume(models.Model):
    """Костюм напрокат. Косплеер сдаёт готовый костюм (дорогой, носят 1–2 раза).

    Денег нет (до ТОО): аренда = заявка → подтверждение владельцем, оплата/залог
    на месте или в ЛС. Монетизация комиссией — после ТОО.
    """
    STATUS_CHOICES = [
        ("available", "Свободен"),
        ("rented", "В аренде"),
        ("unavailable", "Недоступен"),
    ]

    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                              related_name="costumes")
    title = models.CharField("название", max_length=160)
    character = models.CharField("персонаж / фандом", max_length=160, blank=True)
    description = models.TextField("описание", blank=True)
    size = models.CharField("размер", max_length=40, blank=True)  # «M», «42-44», «рост 170»
    price_day = models.PositiveIntegerField("цена/сутки ₸", null=True, blank=True)  # NULL = договорная
    deposit = models.PositiveIntegerField("залог ₸", null=True, blank=True)
    city = models.CharField("город", max_length=80, blank=True)
    image = models.ImageField(upload_to="costumes/", blank=True, null=True)
    status = models.CharField("статус", max_length=12, choices=STATUS_CHOICES, default="available")
    is_active = models.BooleanField("активен", default=True)  # модерация
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "костюм"
        verbose_name_plural = "костюмы"

    def __str__(self):
        return self.title


class RentalRequest(models.Model):
    """Заявка на аренду костюма. pending → approved/declined владельцем; cancelled — отменил арендатор."""
    STATUS_CHOICES = [
        ("pending", "Заявка"),
        ("approved", "Подтверждена"),
        ("declined", "Отклонена"),
        ("cancelled", "Отменена"),
    ]

    costume = models.ForeignKey(Costume, on_delete=models.CASCADE, related_name="requests")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                             related_name="rental_requests")
    date_from = models.DateField("с", null=True, blank=True)
    date_to = models.DateField("по", null=True, blank=True)
    comment = models.CharField("комментарий", max_length=300, blank=True)
    status = models.CharField("статус", max_length=12, choices=STATUS_CHOICES, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "заявка на аренду"
        verbose_name_plural = "заявки на аренду"

    def __str__(self):
        return f"{self.user_id} → костюм {self.costume_id} ({self.status})"
