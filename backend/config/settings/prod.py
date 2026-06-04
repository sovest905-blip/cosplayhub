"""Боевое окружение. Жёсткие настройки ИБ."""
from .base import *  # noqa

DEBUG = False

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

CORS_ALLOWED_ORIGINS = [os.getenv("FRONTEND_ORIGIN")]
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = [os.getenv("FRONTEND_ORIGIN")]

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "WARNING"},
}
