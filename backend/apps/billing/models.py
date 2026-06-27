import calendar

from django.conf import settings
from django.db import models
from django.db.models import Exists, OuterRef, Q
from django.utils import timezone

# Длительность бесплатного триала (мес) при активации Pro/тарифа мастерской.
TRIAL_MONTHS = 6
# Во сколько раз Pro поднимает бесплатные лимиты (галерея/фото мастерской/гайда).
PRO_LIMIT_MULTIPLIER = 4
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
    """Подписка со сроком действия.

    ЕДИНЫЙ тариф (с 2026-06-27): один Pro юзера разблокирует ВСЕ его роли,
    включая мастерские. `is_pro` у User и Workshop вычисляется отсюда —
    никакого крона: просрочка отключается сама (active_until в прошлом → не активна).

    workshop = NULL  → Pro юзера (plan="pro"). Покрывает профиль + все его мастерские.
    active_until = NULL → бессрочно (ручной грант админом).

    plan="workshop" с FK на мастерскую — ЛЕГАСИ (до объединения тарифов). Больше
    не создаётся; миграция 0004 перенесла такие подписки в Pro владельца. Выбор
    в choices оставлен для истории. Workshop.is_pro теперь = owner.is_pro.
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


# ── Аннотации Pro-активности для сортировки каталогов (без N+1) ──────────────────
# is_active = НЕ disabled И (active_until пусто ИЛИ в будущем). Без крона.

def _active_window():
    return Q(disabled=False) & (Q(active_until__isnull=True) | Q(active_until__gt=timezone.now()))


def active_pro_subquery(user_field="user_id"):
    """Exists: у пользователя (OuterRef) активная Pro-подписка профиля.
    Для annotate на queryset с полем user_id (Profile)."""
    subs = Subscription.objects.filter(
        plan="pro", workshop__isnull=True, user=OuterRef(user_field),
    ).filter(_active_window())
    return Exists(subs)


def active_workshop_subquery(owner_field="owner_id"):
    """Exists: у ВЛАДЕЛЬЦА мастерской (OuterRef owner_id) активный Pro.
    Единый тариф: Pro владельца разблокирует boost всех его мастерских.
    Для annotate на Workshop queryset."""
    return active_pro_subquery(owner_field)
