"""Настройки для прогона тестов (pytest).

Полностью изолированы от внешних сервисов: SQLite в памяти вместо Postgres,
кеш и почта — в память (без Redis/SMTP). Это позволяет гонять тесты в CI
без поднятия контейнеров и быстро локально.
"""
from .base import *  # noqa

DEBUG = False

# Быстрая изолированная БД — не нужен Postgres в CI.
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

# Кеш (OTP-коды) и почта — в память, без Redis/SMTP.
CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

# Throttling выключаем: тесты делают много запросов подряд (иначе ложные 429).
REST_FRAMEWORK = {
    **REST_FRAMEWORK,  # noqa: F405
    "DEFAULT_THROTTLE_RATES": {"anon": None, "user": None, "login": None, "otp": None},
}

# Быстрый хешер — тестам не нужен Argon2 (ускоряет создание юзеров кратно).
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

# Telegram не настроен → телефонная регистрация идёт по детерминированному
# тестовому пути (авто-логин), а не пытается создать TG-сессию.
TELEGRAM_BOT_TOKEN = ""
