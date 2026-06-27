from django.conf import settings
from django.db import models


class Look(models.Model):
    """Образ косплеера (фото-пост). Лента /looks, лайки, модерация из админки.

    stage = стадия работы над образом: planned («Хочу скосплеить») → wip («В работе»)
    → done («Готов»). Этапы крафта пишутся в LookUpdate (лента прогресса + связка
    с мастерской «заказал тут»).
    """
    STAGE_CHOICES = [
        ("planned", "Хочу скосплеить"),
        ("wip", "В работе"),
        ("done", "Готов"),
    ]
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                               null=True, blank=True, related_name="looks")
    team = models.ForeignKey("teams.Team", on_delete=models.SET_NULL, null=True, blank=True,
                             related_name="looks")
    title = models.CharField("название", max_length=200)
    character = models.CharField("персонаж / фандом", max_length=160, blank=True)
    description = models.TextField("описание", blank=True)
    image = models.ImageField("фото", upload_to="looks/", blank=True, null=True)
    stage = models.CharField("стадия", max_length=10, choices=STAGE_CHOICES, default="done")
    is_published = models.BooleanField("опубликовано", default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "образ"
        verbose_name_plural = "образы"

    def __str__(self):
        return self.title


class LookUpdate(models.Model):
    """Этап работы над образом (WIP-прогресс). Текст + опц. фото + опц. ссылка
    на мастерскую («заказал парик тут»). Пишет автор образа."""
    look = models.ForeignKey(Look, on_delete=models.CASCADE, related_name="updates")
    text = models.TextField("что сделано", blank=True)
    image = models.ImageField("фото этапа", upload_to="looks/wip/", blank=True, null=True)
    workshop = models.ForeignKey("workshops.Workshop", on_delete=models.SET_NULL,
                                 null=True, blank=True, related_name="look_updates",
                                 verbose_name="мастерская (заказал тут)")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        verbose_name = "этап работы"
        verbose_name_plural = "этапы работы"

    def __str__(self):
        return f"update {self.id} of look {self.look_id}"


class LookLike(models.Model):
    """Лайк образа (один на пользователя)."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="look_likes")
    look = models.ForeignKey(Look, on_delete=models.CASCADE, related_name="likes")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "look")
