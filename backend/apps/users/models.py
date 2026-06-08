from django.contrib.auth.models import AbstractUser
from django.db import models


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
