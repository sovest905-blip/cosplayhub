"""
Telegram Bot — long-polling (urllib only, no extra libs).
Запускается как management command: python manage.py tgbot
"""
import json
import logging
import secrets
import urllib.error
import urllib.request

from django.conf import settings
from django.core.cache import cache

from .otp import generate_otp

logger = logging.getLogger(__name__)

TG_SESSION_TTL = 600  # 10 минут


# ── Redis-ключи ──────────────────────────────────────────────────────────────

def tg_session_key(token: str) -> str:
    return f"tg:session:{token}"


def tg_chat_key(token: str) -> str:
    return f"tg:chat:{token}"


# ── Bot API helpers ───────────────────────────────────────────────────────────

def _api(method: str, payload: dict | None = None) -> dict:
    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/{method}"
    data = json.dumps(payload).encode() if payload else None
    req = urllib.request.Request(
        url, data=data,
        headers={"Content-Type": "application/json"} if data else {},
    )
    try:
        with urllib.request.urlopen(req, timeout=35) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        logger.error("TG API %s error %s: %s", method, e.code, e.read())
        return {}
    except Exception as e:
        logger.error("TG API %s exception: %s", method, e)
        return {}


def send_message(chat_id: int | str, text: str) -> None:
    _api("sendMessage", {"chat_id": chat_id, "text": text})


def get_updates(offset: int) -> list:
    result = _api(f"getUpdates?timeout=30&offset={offset}")
    return result.get("result", [])


# ── Session helpers (вызываются из views) ─────────────────────────────────────

def create_telegram_session(email: str) -> str:
    """Создаёт OTP-сессию, возвращает token для deep-link."""
    token = secrets.token_urlsafe(16)
    code = generate_otp()
    cache.set(tg_session_key(token), {"email": email, "code": code}, timeout=TG_SESSION_TTL)
    return token


def verify_telegram_session(token: str, code: str) -> str | None:
    """
    Проверяет код. Возвращает email если OK, None если нет.
    Побочный эффект: сохраняет telegram_id в User если chat_id уже известен.
    """
    session = cache.get(tg_session_key(token))
    if not session:
        return None
    if session["code"] != code.strip():
        return None
    cache.delete(tg_session_key(token))

    email = session["email"]
    chat_id = cache.get(tg_chat_key(token))
    if chat_id:
        cache.delete(tg_chat_key(token))
        # Сохраняем telegram_id если ещё не привязан
        try:
            from .models import User
            user = User.objects.get(email=email)
            if not user.telegram_id:
                user.telegram_id = str(chat_id)
                user.save(update_fields=["telegram_id"])
        except Exception:
            pass

    return email


# ── Long-polling loop (вызывается из management command) ─────────────────────

def run_polling() -> None:
    logger.info("Telegram bot started (long-polling)")
    offset = 0
    while True:
        updates = get_updates(offset)
        for update in updates:
            offset = update["update_id"] + 1
            _handle_update(update)


def _handle_update(update: dict) -> None:
    msg = update.get("message", {})
    text = (msg.get("text") or "").strip()
    chat_id = (msg.get("chat") or {}).get("id")
    if not chat_id or not text.startswith("/start"):
        return

    parts = text.split(maxsplit=1)
    if len(parts) < 2:
        send_message(chat_id, "Привет! Этот бот используется для подтверждения входа на КосплейХаб.\n\nПерейдите на сайт чтобы получить ссылку для входа.")
        return

    token = parts[1].strip()
    session = cache.get(tg_session_key(token))
    if not session:
        send_message(chat_id, "❌ Ссылка устарела или уже использована. Запросите новый код на сайте.")
        return

    cache.set(tg_chat_key(token), chat_id, timeout=TG_SESSION_TTL)
    code = session["code"]
    send_message(
        chat_id,
        f"🔐 Ваш код входа в КосплейХаб:\n\n{code}\n\nДействителен 10 минут. Не передавайте никому.",
    )
