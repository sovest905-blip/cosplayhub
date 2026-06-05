from django.conf import settings
from django.db import models


class Listing(models.Model):
    TYPE_CHOICES = [
        ("job",    "Ищу специалиста"),
        ("collab", "Коллаборация"),
        ("sell",   "Продаю"),
        ("buy",    "Куплю"),
    ]
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="listings"
    )
    title = models.CharField("заголовок", max_length=120)
    description = models.TextField("описание", blank=True)
    type = models.CharField("тип", max_length=20, choices=TYPE_CHOICES)
    city = models.CharField("город", max_length=80, blank=True)
    price = models.PositiveIntegerField("цена ₸", null=True, blank=True)
    is_active = models.BooleanField("активно", default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title
