from django.conf import settings
from django.db import models
from django.utils import timezone


class Battle(models.Model):
    """Косплей-баттл/конкурс: тема + окно голосования. Участники заявляют свои
    образы (Look), остальные голосуют. Победитель — по числу голосов.

    Статус вычисляется по датам — БЕЗ крона (как Subscription). Пустые даты =
    голосование открыто бессрочно.
    """
    title = models.CharField("название", max_length=160)
    theme = models.CharField("тема", max_length=160, blank=True)
    description = models.TextField("описание", blank=True)
    cover = models.ImageField(upload_to="battles/", blank=True, null=True)
    starts_at = models.DateField("старт голосования", null=True, blank=True)
    ends_at = models.DateField("конец голосования", null=True, blank=True)
    is_active = models.BooleanField("активен", default=True)  # модерация
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                   null=True, blank=True, related_name="battles")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "баттл"
        verbose_name_plural = "баттлы"

    @property
    def status(self) -> str:
        today = timezone.localdate()
        if self.starts_at and today < self.starts_at:
            return "upcoming"
        if self.ends_at and today > self.ends_at:
            return "finished"
        return "voting"

    @property
    def can_vote(self) -> bool:
        return self.is_active and self.status == "voting"

    @property
    def can_enter(self) -> bool:
        return self.is_active and self.status in ("upcoming", "voting")

    def __str__(self):
        return self.title


class BattleEntry(models.Model):
    """Заявка-участник баттла: образ (Look) в конкурсе. Один образ — одна заявка."""
    battle = models.ForeignKey(Battle, on_delete=models.CASCADE, related_name="entries")
    look = models.ForeignKey("looks.Look", on_delete=models.CASCADE, related_name="battle_entries")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                             related_name="battle_entries")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("battle", "look")
        ordering = ["created_at"]
        verbose_name = "участник баттла"
        verbose_name_plural = "участники баттла"

    def __str__(self):
        return f"entry {self.look_id} @ battle {self.battle_id}"


class BattleVote(models.Model):
    """Голос за заявку. Один голос на пользователя в рамках баттла (можно сменить)."""
    battle = models.ForeignKey(Battle, on_delete=models.CASCADE, related_name="votes")
    entry = models.ForeignKey(BattleEntry, on_delete=models.CASCADE, related_name="votes")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                             related_name="battle_votes")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("battle", "user")  # один голос на баттл
        verbose_name = "голос"
        verbose_name_plural = "голоса"

    def __str__(self):
        return f"vote {self.user_id} → entry {self.entry_id}"
