import calendar

from django.conf import settings
from django.db import models
from django.utils import timezone

# Длительность бесплатного триала (мес) при активации Pro/тарифа мастерской.
TRIAL_MONTHS = 6
# Справочные цены ₸/мес (для отображения; реальная оплата подключится позже).
PLAN_PRICES = {"pro": 1990, "workshop": 1990}


def add_months(dt, months: int):
    """Аккуратно прибавляет N месяцев к дате (без внешних зависимостей)."""
    m = dt.month - 1 + months
    y = dt.year + m // 12
    m = m % 12 + 1
    d = min(dt.day, calendar.monthrange(y, m)[1])
    return dt.replace(year=y, month=m, day=d)


class Subscription(models.Model):
    """Подписка/тариф со сроком действия.

    Источник истины для Pro профиля и тарифа мастерской. `is_pro` у User и
    Workshop вычисляется отсюда — никакого крона: просрочка отключается сама
    (active_until в прошлом → не активна).

    workshop = NULL  → Pro профиля пользователя (plan="pro").
    workshop задан    → тариф конкретной мастерской (plan="workshop").
    active_until = NULL → бессрочно (ручной грант админом).
    """
    PLAN_CHOICES = [("pro", "Pro профиля"), ("workshop", "Тариф мастерской")]
    SOURCE_CHOICES = [("trial", "Триал"), ("manual", "Вручную"), ("payment", "Оплата")]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="subscriptions"
    )
    workshop = models.ForeignKey(
        "workshops.Workshop", on_delete=models.CASCADE,
        null=True, blank=True, related_name="subscriptions",
    )
    plan = models.CharField("тариф", max_length=20, choices=PLAN_CHOICES)
    source = models.CharField("источник", max_length=20, choices=SOURCE_CHOICES, default="trial")
    active_until = models.DateTimeField("активна до", null=True, blank=True,
                                        help_text="Пусто = бессрочно")
    disabled = models.BooleanField("отключена", default=False,
                                   help_text="Принудительно выключить, не удаляя историю")
    note = models.CharField("заметка", max_length=200, blank=True)
    started_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-started_at"]
        verbose_name = "подписка"
        verbose_name_plural = "подписки"
        constraints = [
            models.UniqueConstraint(
                fields=["user"], condition=models.Q(workshop__isnull=True, plan="pro"),
                name="uniq_user_pro",
            ),
            models.UniqueConstraint(
                fields=["workshop"], condition=models.Q(workshop__isnull=False),
                name="uniq_workshop_sub",
            ),
        ]

    @property
    def is_active(self) -> bool:
        if self.disabled:
            return False
        if self.active_until is None:
            return True
        return self.active_until > timezone.now()

    @property
    def status(self) -> str:
        if self.disabled:
            return "disabled"
        return "active" if self.is_active else "expired"

    def extend(self, months: int, source: str = "payment"):
        """Продлить на N месяцев от текущего срока (или от сейчас, если истекла)."""
        now = timezone.now()
        base = self.active_until if (self.active_until and self.active_until > now) else now
        self.active_until = add_months(base, months)
        self.source = source
        self.disabled = False
        self.save(update_fields=["active_until", "source", "disabled", "updated_at"])

    def __str__(self):
        return f"{self.get_plan_display()} #{self.pk} ({self.status})"
