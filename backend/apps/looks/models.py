from django.conf import settings
from django.db import models


class Look(models.Model):
    """Образ косплеера (фото-пост). Лента /looks, лайки, модерация из админки."""
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                               null=True, blank=True, related_name="looks")
    team = models.ForeignKey("teams.Team", on_delete=models.SET_NULL, null=True, blank=True,
                             related_name="looks")
    title = models.CharField("название", max_length=200)
    character = models.CharField("персонаж / фандом", max_length=160, blank=True)
    description = models.TextField("описание", blank=True)
    image = models.ImageField("фото", upload_to="looks/", blank=True, null=True)
    is_published = models.BooleanField("опубликовано", default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "образ"
        verbose_name_plural = "образы"

    def __str__(self):
        return self.title


class LookLike(models.Model):
    """Лайк образа (один на пользователя)."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="look_likes")
    look = models.ForeignKey(Look, on_delete=models.CASCADE, related_name="likes")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "look")
