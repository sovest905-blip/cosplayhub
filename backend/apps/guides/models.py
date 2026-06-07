from django.conf import settings
from django.db import models


class Guide(models.Model):
    """Гайд/туториал по крафту. Пишут залогиненные юзеры и админы."""
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                               null=True, blank=True, related_name="guides")
    title = models.CharField("заголовок", max_length=200)
    summary = models.CharField("кратко", max_length=300, blank=True)
    body = models.TextField("текст", blank=True)
    category = models.CharField("категория", max_length=40, blank=True)  # EVA, Парики, Грим, 3D-печать, Общее
    cover = models.ImageField("обложка", upload_to="guides/", blank=True, null=True)
    is_published = models.BooleanField("опубликовано", default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "гайд"
        verbose_name_plural = "гайды"

    def __str__(self):
        return self.title
