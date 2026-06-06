from django.conf import settings
from django.db import models


class News(models.Model):
    """Новость платформы. Публикуется админом, видна всем на /news."""
    title = models.CharField("заголовок", max_length=200)
    body = models.TextField("текст", blank=True)
    image = models.ImageField("картинка", upload_to="news/", blank=True, null=True)
    is_pinned = models.BooleanField("закреплено", default=False)
    is_published = models.BooleanField("опубликовано", default=True)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                               null=True, blank=True, related_name="news")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Закреплённые — сверху, затем по дате (свежие первыми).
        ordering = ["-is_pinned", "-created_at"]
        verbose_name = "новость"
        verbose_name_plural = "новости"

    def __str__(self):
        return self.title
