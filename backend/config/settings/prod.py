"""Боевое окружение. Жёсткие настройки ИБ."""
from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa

DEBUG = False

# Fail-fast: не запускаемся в проде с дефолтным ключом/пустым списком хостов.
if SECRET_KEY == "insecure-dev-key":
    raise ImproperlyConfigured(
        "DJANGO_SECRET_KEY не задан — отказ запускаться в проде с небезопасным дефолтным ключом."
    )
if ALLOWED_HOSTS == ["localhost"]:
    raise ImproperlyConfigured(
        "DJANGO_ALLOWED_HOSTS не задан для прода (осталось значение по умолчанию 'localhost')."
    )

# === ИБ ===
# Пока тест-сервер работает по HTTP (нет TLS) — Secure-куки ВЫКЛ, иначе браузер
# не сохраняет сессию и после логина выкидывает на форму. Включить через env когда будет HTTPS.
SECURE_COOKIES = os.getenv("SECURE_COOKIES", "False").lower() == "true"
SECURE_SSL_REDIRECT = False  # nginx handles SSL termination
SESSION_COOKIE_SECURE = SECURE_COOKIES
CSRF_COOKIE_SECURE = SECURE_COOKIES
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"

# HSTS — только когда реально есть HTTPS
SECURE_HSTS_SECONDS = 31536000 if SECURE_COOKIES else 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = SECURE_COOKIES
SECURE_HSTS_PRELOAD = SECURE_COOKIES

SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
X_FRAME_OPTIONS = "DENY"

# Доверенные origin'ы для CORS и CSRF. Можно перечислить через запятую в
# CSRF_TRUSTED_ORIGINS (приоритет) либо одним значением FRONTEND_ORIGIN.
# ВАЖНО: origin включает порт. http://IP и http://IP:8080 — РАЗНЫЕ origin'ы.
# Если не совпадает с тем, что шлёт браузер → "CSRF Failed: Origin checking failed".
_raw_origins = os.getenv("CSRF_TRUSTED_ORIGINS") or os.getenv("FRONTEND_ORIGIN", "")
_trusted = [o.strip() for o in _raw_origins.split(",") if o.strip()]
CORS_ALLOWED_ORIGINS = _trusted
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = _trusted

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "WARNING"},
}
