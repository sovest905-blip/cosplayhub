"""Настройки для прогона тестов (pytest).

БД — настоящий Postgres (как в проде): часть запросов использует
JSONField `roles__contains`, который SQLite не поддерживает. Параметры БД
берутся из POSTGRES_* env (в CI поднимается сервис postgres, см. deploy.yml).
Кеш и почта — в память (без Redis/SMTP), чтобы не тянуть лишние сервисы.
"""
from .base import *  # noqa

DEBUG = False

# DATABASES наследуется из base (POSTGRES_* env). В CI env указывает на сервис postgres.

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
