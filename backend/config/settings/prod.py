"""Боевое окружение. Жёсткие настройки ИБ."""
from .base import *  # noqa

DEBUG = False

# === ИБ: всё через HTTPS ===
SECURE_SSL_REDIRECT = False  # nginx handles SSL termination
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Strict"

# HSTS — браузер запоминает что сайт только по HTTPS
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

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
