from django.conf import settings
from django.db import models


class Shoot(models.Model):
    """Проект съёмки — «собери команду». Организатор зовёт косплееров, фотографа,
    локацию и (опц.) мастерскую с костюмом/реквизитом в один флоу.

    Денег нет (до ТОО): участие = приглашение/заявка → подтверждение. Все 4 сущности
    уже есть по отдельности (профили ролей, bookings.Slot, Workshop) — Shoot их связывает.
    """
    STATUS_CHOICES = [
        ("open", "Набор открыт"),
        ("full", "Команда собрана"),
        ("done", "Прошла"),
        ("cancelled", "Отменена"),
    ]
    # Какие роли можно искать в команду (для looking_for и участников).
    ROLE_CHOICES = [
        ("cosplayer", "Косплеер"),
        ("photographer", "Фотограф"),
        ("model", "Модель"),
        ("location", "Локация"),
        ("workshop", "Мастерская"),
        ("other", "Другое"),
    ]

    organizer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                                  related_name="shoots")
    title = models.CharField("название", max_length=160)
    description = models.TextField("описание", blank=True)
    city = models.CharField("город", max_length=80, blank=True)
    date = models.DateField("дата", null=True, blank=True)
    location = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                 null=True, blank=True, related_name="shoots_as_location",
                                 verbose_name="локация (профиль)")
    workshop = models.ForeignKey("workshops.Workshop", on_delete=models.SET_NULL,
                                 null=True, blank=True, related_name="shoots",
                                 verbose_name="мастерская (костюм/реквизит)")
    looking_for = models.JSONField("ищем роли", default=list, blank=True)  # ["cosplayer","photographer"]
    cover = models.ImageField(upload_to="shoots/", blank=True, null=True)
    status = models.CharField("статус", max_length=12, choices=STATUS_CHOICES, default="open")
    is_active = models.BooleanField("активна", default=True)  # модерация
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "съёмка"
        verbose_name_plural = "съёмки"

    def __str__(self):
        return f"{self.title} ({self.get_status_display()})"


class ShootParticipant(models.Model):
    """Участник съёмки. invited — позвал организатор; requested — попросился сам;
    confirmed — в команде; declined — отказ. Уникален на (shoot, user)."""
    STATUS_CHOICES = [
        ("invited", "Приглашён"),
        ("requested", "Заявка"),
        ("confirmed", "В команде"),
        ("declined", "Отклонён"),
    ]

    shoot = models.ForeignKey(Shoot, on_delete=models.CASCADE, related_name="participants")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                             related_name="shoot_participations")
    role = models.CharField("роль", max_length=20, choices=Shoot.ROLE_CHOICES, default="cosplayer")
    status = models.CharField("статус", max_length=12, choices=STATUS_CHOICES, default="requested")
    comment = models.CharField("комментарий", max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        unique_together = ("shoot", "user")
        verbose_name = "участник съёмки"
        verbose_name_plural = "участники съёмки"

    def __str__(self):
        return f"{self.user_id} @ shoot {self.shoot_id} ({self.status})"
