from django.conf import settings
from django.db import models


class Product(models.Model):
    """Товар магазина. Витрина продавца на /people/[id] + страница товара /products/[id].

    Минимум для беты: фото, название, цена, статус наличия, описание. Оплата — позже (до ТОО),
    сейчас связь с продавцом через мессенджер.
    """
    STATUS_CHOICES = [
        ("in_stock", "В наличии"),
        ("on_order", "На заказ"),
        ("sold",     "Продано"),
    ]
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                              null=True, blank=True, related_name="products")
    title = models.CharField("название", max_length=160)
    description = models.TextField("описание", blank=True)
    price = models.PositiveIntegerField("цена ₸", null=True, blank=True)  # NULL = «по запросу»
    image = models.ImageField("фото", upload_to="products/", blank=True, null=True)
    image_url = models.URLField("фото по ссылке", blank=True)  # для демо/внешних картинок
    category = models.CharField("категория", max_length=80, blank=True)  # группировка витрины (опц.)
    status = models.CharField("статус", max_length=20, choices=STATUS_CHOICES, default="in_stock")
    is_active = models.BooleanField("активен", default=True)  # модерация
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "товар"
        verbose_name_plural = "товары"

    def __str__(self):
        return self.title
