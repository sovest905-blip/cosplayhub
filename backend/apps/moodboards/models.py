from django.conf import settings
from django.db import models


class Moodboard(models.Model):
    """Доска-коллекция референсов/образов (как Pinterest-борд)."""
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                              null=True, blank=True, related_name="moodboards")
    title = models.CharField("название", max_length=160)
    description = models.TextField("описание", blank=True)
    cover = models.ImageField("обложка", upload_to="moodboards/", blank=True, null=True)
    is_public = models.BooleanField("публичная", default=True)   # видна в каталоге
    is_active = models.BooleanField("активна", default=True)     # модерация
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class MoodboardItem(models.Model):
    """Картинка в доске: загруженная или по ссылке (для референсов)."""
    board = models.ForeignKey(Moodboard, on_delete=models.CASCADE, related_name="items")
    image = models.ImageField("картинка", upload_to="moodboards/items/", blank=True, null=True)
    image_url = models.URLField("ссылка на картинку", blank=True)
    caption = models.CharField("подпись", max_length=200, blank=True)
    price = models.CharField("цена", max_length=40, blank=True)  # витрина магазина/локации (текст: «5 000 ₸»)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]
