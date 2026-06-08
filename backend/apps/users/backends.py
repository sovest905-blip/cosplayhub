import re

from django.contrib.auth.backends import BaseBackend
from rest_framework.authentication import SessionAuthentication

from .models import User


class CsrfExemptSessionAuthentication(SessionAuthentication):
    """ИСТОРИЧЕСКОЕ имя: теперь CSRF ПРОВЕРЯЕТСЯ штатно (поведение = SessionAuthentication).

    Раньше enforce_csrf был отключён и защита держалась ТОЛЬКО на SameSite=Lax —
    это не закрывало форджинг с скомпрометированного same-site поддомена (напр. webmail).
    Теперь фронт шлёт заголовок X-CSRFToken (из не-HttpOnly cookie csrftoken) на все мутации.
    Имя класса оставлено, чтобы не трогать ~14 импортов; CSRF для анонимных запросов
    DRF не требует (нет session-пользователя), поэтому login/register/verify работают как раньше."""
    pass


def _normalize_phone(raw: str) -> str:
    digits = re.sub(r"\D", "", raw)
    if len(digits) == 11 and digits.startswith("8"):
        digits = "7" + digits[1:]
    if len(digits) == 10:
        digits = "7" + digits
    return "+" + digits if digits else raw


def resolve_user(identifier: str) -> User | None:
    """Найти пользователя по email, телефону или telegram_id."""
    identifier = identifier.strip()
    if "@" in identifier:
        return User.objects.filter(email__iexact=identifier).first()
    # Проверяем на telegram_id (только цифры, длинный)
    if identifier.isdigit() and len(identifier) > 10:
        return User.objects.filter(telegram_id=identifier).first()
    # Телефон
    phone = _normalize_phone(identifier)
    return User.objects.filter(phone=phone).first()


class IdentifierBackend(BaseBackend):
    """Аутентификация по email / телефону / telegram_id + пароль."""

    def authenticate(self, request, username=None, password=None, **kwargs):
        if not username:
            return None
        user = resolve_user(username)
        if user is None:
            return None
        if not user.is_active:
            return None  # заблокированный аккаунт не пускаем
        if user.check_password(password):
            return user
        return None

    def get_user(self, user_id: int) -> User | None:
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None
