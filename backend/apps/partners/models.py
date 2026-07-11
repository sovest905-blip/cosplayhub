from django.db import models


class Partner(models.Model):
    """Партнёр/спонсор платформы. Показывается лого-полосой над футером (strip)
    и/или нативной карточкой в ленте (feed). Управляется из админ-панели."""
    TIER_CHOICES = [
        ("general", "Генеральный"),
        ("partner", "Партнёр"),
    ]
    name = models.CharField("название", max_length=120)
    url = models.URLField("ссылка", max_length=500)
    logo = models.ImageField("логотип", upload_to="partners/", blank=True, null=True)
    logo_url = models.URLField("логотип по ссылке", max_length=500, blank=True)  # демо/внешний
    tier = models.CharField("уровень", max_length=20, choices=TIER_CHOICES, default="partner")
    card_text = models.CharField("текст карточки", max_length=160, blank=True)
    show_strip = models.BooleanField("в лого-полосе", default=True)
    show_feed = models.BooleanField("карточкой в ленте", default=False)
    is_active = models.BooleanField("активен", default=True)
    order = models.PositiveIntegerField("порядок", default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order", "id"]
        verbose_name = "партнёр"
        verbose_name_plural = "партнёры"

    def __str__(self):
        return self.name
