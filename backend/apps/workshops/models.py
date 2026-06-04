from django.conf import settings
from django.db import models

class Workshop(models.Model):
    """Мастерская: 3D-печать, EVA, пошив, парики."""
    TYPE_CHOICES = [
        ("print3d", "3D-печать"), ("eva", "EVA"),
        ("sewing", "Швейная"), ("wigs", "Парики"),
    ]
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                              related_name="workshops")
    name = models.CharField("название", max_length=120)
    type = models.CharField("тип", max_length=20, choices=TYPE_CHOICES)
    city = models.CharField("город", max_length=80)
    about = models.TextField("описание", blank=True)
    cover = models.ImageField(upload_to="workshops/", blank=True, null=True)
    eta = models.CharField("срок", max_length=40, blank=True)   # "7-14д"
    rating = models.DecimalField(max_digits=2, decimal_places=1, default=0)
    orders_count = models.PositiveIntegerField(default=0)
    is_pro = models.BooleanField("PRO-тариф", default=False)    # 0% комиссии
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Service(models.Model):
    """Услуга мастерской с ценой."""
    workshop = models.ForeignKey(Workshop, on_delete=models.CASCADE, related_name="services")
    name = models.CharField(max_length=120)
    description = models.CharField(max_length=200, blank=True)
    price_from = models.PositiveIntegerField("цена от, ₸")
