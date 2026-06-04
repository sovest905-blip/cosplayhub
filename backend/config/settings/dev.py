"""Окружение разработки."""
from .base import *  # noqa

DEBUG = True

# CORS: разрешаем фронту на localhost
CORS_ALLOWED_ORIGINS = [os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")]
CORS_ALLOW_CREDENTIALS = True   # чтобы cookie ходили

# CSRF доверяет фронту
CSRF_TRUSTED_ORIGINS = [os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")]

# Cookie в dev (без HTTPS)
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_HTTPONLY = False     # фронту нужно прочитать CSRF-токен
