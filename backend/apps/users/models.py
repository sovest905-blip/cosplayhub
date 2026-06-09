import secrets

from django.contrib.auth.models import AbstractUser
from django.db import models


def _invite_code() -> str:
    """Читаемый код без похожих символов (0/O, 1/I/L)."""
    alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
    return "".join(secrets.choice(alphabet) for _ in range(10))


class Invite(models.Model):
    """Инвайт для закрытой беты: регистрация только по коду (флаг INVITE_REQUIRED).
    max_uses=0 — безлимитный код (одна ссылка на всю тусовку)."""
    code = models.CharField("код", max_length=20, unique=True, default=_invite_code)
    note = models.CharField("заметка (для кого)", max_length=120, blank=True)
    max_uses = models.PositiveIntegerField("лимит использований (0 = безлимит)", default=1)
    used_count = models.PositiveIntegerField("использован раз", default=0)
    is_active = models.BooleanField("активен", default=True)
    created_by = models.ForeignKey(
        "users.User", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="invites_created", verbose_name="создал",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "инвайт"
        verbose_name_plural = "инвайты"

    @property
    def has_room(self) -> bool:
        """Можно ли ещё регистрироваться по этому коду."""
        return self.is_active and (self.max_uses == 0 or self.used_count < self.max_uses)

    def __str__(self):
        return self.code


class User(AbstractUser):
    """
    Аккаунт — отдельная сущность. К нему привязываются идентификаторы:
    email, phone, telegram_id. Войти можно по любому подтверждённому.
    is_verified = синяя галочка (выдаётся вручную, не путать с верификацией email/phone).
    """
    # Идентификаторы (каждый может быть null — но хотя бы один должен быть)
    email = models.EmailField("email", unique=True, null=True, blank=True)
    phone = models.CharField("телефон", max_length=20, blank=True, db_index=True)
    telegram_id = models.CharField("telegram", max_length=32, blank=True, db_index=True)

    # Статусы подтверждения идентификаторов
    is_email_verified = models.BooleanField("email подтверждён", default=False)
    is_phone_verified = models.BooleanField("телефон подтверждён", default=False)

    # Профиль
    city = models.CharField("город", max_length=80, blank=True)
    is_verified = models.BooleanField("синяя галочка", default=False)
    invite = models.ForeignKey(
        Invite, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="users", verbose_name="пришёл по инвайту",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = []

    @property
    def is_confirmed(self) -> bool:
        """Аккаунт активен если хотя бы один идентификатор подтверждён."""
        return self.is_email_verified or self.is_phone_verified

    @property
    def is_pro(self) -> bool:
        """Pro профиля — вычисляется из активной подписки (billing)."""
        sub = self.subscriptions.filter(plan="pro", workshop__isnull=True).first()
        return bool(sub and sub.is_active)

    def __str__(self):
        return self.email or self.phone or self.username
