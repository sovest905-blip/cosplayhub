"""Общие настройки для всех окружений."""
import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "insecure-dev-key")
ALLOWED_HOSTS = os.getenv("DJANGO_ALLOWED_HOSTS", "localhost").split(",")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # сторонние
    "rest_framework",
    "corsheaders",
    "django_filters",
    "drf_spectacular",
    # наши приложения (по сущностям)
    "apps.users",
    "apps.profiles",
    "apps.workshops",
    "apps.billing",
    "apps.orders",
    "apps.listings",
    "apps.messaging",
    "apps.notifications",
    "apps.news",
    "apps.events",
    "apps.guides",
    "apps.looks",
    "apps.teams",
    "apps.products",
    "apps.bookings",
    "apps.shoots",
    "apps.rentals",
    "apps.battles",
    "apps.homepage",
    "apps.analytics",
    "apps.partners",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

TEMPLATES = [{
    "BACKEND": "django.template.backends.django.DjangoTemplates",
    "DIRS": [],
    "APP_DIRS": True,
    "OPTIONS": {"context_processors": [
        "django.template.context_processors.request",
        "django.contrib.auth.context_processors.auth",
        "django.contrib.messages.context_processors.messages",
    ]},
}]

# PostgreSQL
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("POSTGRES_DB", "cosplayhub"),
        "USER": os.getenv("POSTGRES_USER", "cosplayhub"),
        "PASSWORD": os.getenv("POSTGRES_PASSWORD", ""),
        "HOST": os.getenv("POSTGRES_HOST", "db"),
        "PORT": os.getenv("POSTGRES_PORT", "5432"),
    }
}

# Redis-кеш
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": os.getenv("REDIS_URL", "redis://redis:6379/0"),
    }
}

# === ИБ: пароли через Argon2id ===
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
]
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
     "OPTIONS": {"min_length": 10}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# Кастомная модель пользователя (обязательно с первой миграции!)
AUTH_USER_MODEL = "users.User"

# === DRF ===
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        # Веб: сессия в HttpOnly cookie (НЕ JWT в localStorage)
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        # По умолчанию закрыто. Открываем явно где надо AllowAny.
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_PAGINATION_CLASS": "common.pagination.StandardPagination",
    "PAGE_SIZE": 24,
    "DEFAULT_FILTER_BACKENDS": ["django_filters.rest_framework.DjangoFilterBackend"],
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    # Лимиты вынесены в env — тюнятся под ресурс сервера без правки кода.
    # Дефолты = исходные значения (login/otp остаются защитой от брутфорса).
    "DEFAULT_THROTTLE_RATES": {
        "anon": os.getenv("THROTTLE_ANON", "60/min"),
        "user": os.getenv("THROTTLE_USER", "240/min"),
        "login": os.getenv("THROTTLE_LOGIN", "10/min"),
        "otp": os.getenv("THROTTLE_OTP", "5/min"),   # не более 5 OTP-запросов в минуту
    },
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

SPECTACULAR_SETTINGS = {
    "TITLE": "КосплейХаб API",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

# ── Email (SMTP) ──────────────────────────────────────────────────────────────
# Свой почтовик (Postfix на той же машине) отдаёт самоподписанный Plesk-сертификат,
# поэтому для него используем backend без проверки серта (config.email_backend).
# Через env, чтобы dev/mailhog/Brevo оставались на стандартном backend.
EMAIL_BACKEND = os.getenv("EMAIL_BACKEND", "django.core.mail.backends.smtp.EmailBackend")
EMAIL_HOST = os.getenv("EMAIL_HOST", "mailhog")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "1025"))
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "False").lower() == "true"
EMAIL_USE_SSL = os.getenv("EMAIL_USE_SSL", "False").lower() == "true"  # Яндекс: порт 465
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "КосплейХаб <noreply@cosplayhub.kz>")

# ── Закрытая бета: регистрация только по инвайту ─────────────────────────────
# INVITE_REQUIRED=true в .env → при регистрации обязателен код инвайта (модель users.Invite).
# Выключено по умолчанию (dev/тесты регистрируются свободно); валидный код принимается всегда.
INVITE_REQUIRED = os.getenv("INVITE_REQUIRED", "false").lower() == "true"

# ── Telegram Bot ──────────────────────────────────────────────────────────────
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_BOT_USERNAME = os.getenv("TELEGRAM_BOT_USERNAME", "")

# ── Crypto Pay (@CryptoBot) — ОСНОВНОЙ шлюз (Pro + донаты) ─────────────────────
# Telegram-нативный, без модерации мерчанта, минимум ~$0.01, цена в фиате KZT.
# Проверено: ₸10..₸1990 проходят, 11 монет (USDT/TON/BTC/…). Оплата в Telegram.
# Токен: @CryptoBot → Crypto Pay → app → API Token. Пусто = оплата отключена.
CRYPTOPAY_TOKEN = os.getenv("CRYPTOPAY_TOKEN", "")

# ── NOWPayments (РЕЗЕРВ; высокий минимум ~$12, не в платёжном пути) ────────────
# NOWPayments — некастодиальный шлюз: деньги идут напрямую на выплатной кошелёк
# мерчанта t50.team (задаётся в кабинете NOWPayments → Payout wallets). Донаты
# АВТОРАМ через шлюз НЕ идут — у авторов прямой кошелёк (P2P). Ключи: кабинет
# NOWPayments → Settings → Payments (API key / IPN secret). Пусто = оплата отключена.
NOWPAYMENTS_API_KEY = os.getenv("NOWPAYMENTS_API_KEY", "")       # x-api-key
NOWPAYMENTS_IPN_SECRET = os.getenv("NOWPAYMENTS_IPN_SECRET", "")  # для подписи вебхука
PRO_PRICE = os.getenv("PRO_PRICE", "1990")               # цена Pro за 1 мес в PAY_CURRENCY
# Валюта инвойса (фиат, NOWPayments сконвертит в крипту). KZT принимается шлюзом
# (проверено: ₸1990 ≈ 4.19 USDT) и совпадает с ценой на сайте. Можно сменить на usd.
PAY_CURRENCY = os.getenv("PAY_CURRENCY", "kzt")
SITE_URL = os.getenv("SITE_URL", "https://www.cosplayhub.kz").rstrip("/")

# ── Cryptomus (крипто-приём ДОНАТОВ сайту) ────────────────────────────────────
# У NOWPayments высокий минимум приёма (USDT-TRC20 ~$10.9) — мелкие донаты не
# проходят. Cryptomus кастодиальный, минимум приёма ~0.5 USDT, поэтому донаты
# сайту (₸500+) идут через него. Pro (крупнее) остаётся на NOWPayments.
# Ключи: кабинет Cryptomus → Бизнес → мерчант → Settings → API. Пусто = донаты
# через шлюз отключены. Валюта донатов — PAY_CURRENCY (kzt).
CRYPTOMUS_MERCHANT_ID = os.getenv("CRYPTOMUS_MERCHANT_ID", "")
CRYPTOMUS_API_KEY = os.getenv("CRYPTOMUS_API_KEY", "")   # платёжный API-ключ мерчанта

AUTHENTICATION_BACKENDS = [
    "apps.users.backends.IdentifierBackend",
]

LANGUAGE_CODE = "ru-ru"
TIME_ZONE = "Asia/Almaty"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
