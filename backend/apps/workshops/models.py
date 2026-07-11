from django.conf import settings
from django.db import models

class Workshop(models.Model):
    """Мастерская: 3D-печать, EVA, пошив, парики."""
    TYPE_CHOICES = [
        ("print3d", "3D-печать"), ("eva", "EVA-пена"),
        ("sewing", "Швейная"), ("wigs", "Парики"),
    ]
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                              related_name="workshops")
    name = models.CharField("название", max_length=120)
    type = models.CharField("тип", max_length=20, choices=TYPE_CHOICES)
    city = models.CharField("город", max_length=80)
    about = models.TextField("описание", blank=True)
    logo = models.ImageField("логотип", upload_to="workshops/logos/", blank=True, null=True)
    cover = models.ImageField("обложка", upload_to="workshops/", blank=True, null=True)
    eta = models.CharField("срок", max_length=40, blank=True)   # "7-14д"
    # Контакты для связи (помимо кнопки «Написать» и заказа).
    phone = models.CharField("телефон / WhatsApp", max_length=40, blank=True)
    telegram = models.CharField("Telegram", max_length=80, blank=True)
    instagram = models.CharField("Instagram", max_length=120, blank=True)
    site = models.CharField("сайт", max_length=200, blank=True)
    rating = models.DecimalField(max_digits=2, decimal_places=1, default=0)
    orders_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def is_pro(self) -> bool:
        """Единый тариф: мастерская Pro, если её владелец — Pro (billing)."""
        return self.owner.is_pro

    def __str__(self):
        return self.name

class WorkshopPhoto(models.Model):
    """Фото работ мастерской (портфолио). Лимит 5 штук — проверяется в API."""
    workshop = models.ForeignKey(Workshop, on_delete=models.CASCADE, related_name="photos")
    image = models.ImageField(upload_to="workshops/photos/")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]


class Service(models.Model):
    """Услуга мастерской с ценой."""
    workshop = models.ForeignKey(Workshop, on_delete=models.CASCADE, related_name="services")
    name = models.CharField(max_length=120)
    description = models.CharField(max_length=200, blank=True)
    price_from = models.PositiveIntegerField("цена от, ₸")
