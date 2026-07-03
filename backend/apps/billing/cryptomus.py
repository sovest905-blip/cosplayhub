"""Тонкий клиент Cryptomus (https://doc.cryptomus.com/) — для донатов сайту.

Подпись запроса/вебхука: md5( base64( JSON-тело ) + API_KEY ), где JSON кодируется
как в PHP json_encode (без пробелов, не-ASCII \\uXXXX, слэши \\/). Cryptomus за
Cloudflare — обязателен User-Agent, иначе 403.
"""
import base64
import hashlib
import hmac
import json
import urllib.error
import urllib.request

from django.conf import settings

API_URL = "https://api.cryptomus.com/v1"
USER_AGENT = "CosplayHub/1.0 (+https://cosplayhub.kz)"

GatewayError = urllib.error.URLError


def is_configured() -> bool:
    return bool(settings.CRYPTOMUS_MERCHANT_ID and settings.CRYPTOMUS_API_KEY)


def _php_json(payload: dict) -> str:
    s = json.dumps(payload, separators=(",", ":"), ensure_ascii=True)
    return s.replace("/", "\\/")


def _sign(body: str) -> str:
    b64 = base64.b64encode(body.encode()).decode()
    return hashlib.md5((b64 + settings.CRYPTOMUS_API_KEY).encode()).hexdigest()


def create_invoice(*, amount, currency, order_id, callback_url, return_url, success_url):
    """Создаёт инвойс, возвращает result{} (в т.ч. uuid и url страницы оплаты)."""
    payload = {
        "amount": str(amount),
        "currency": currency,
        "order_id": order_id,
        "url_callback": callback_url,
        "url_return": return_url,
        "url_success": success_url,
    }
    body = _php_json(payload)
    req = urllib.request.Request(
        f"{API_URL}/payment", data=body.encode(), method="POST",
        headers={
            "merchant": settings.CRYPTOMUS_MERCHANT_ID,
            "sign": _sign(body),
            "Content-Type": "application/json",
            "User-Agent": USER_AGENT,
        },
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode()).get("result", {})


def verify_webhook(data: dict) -> bool:
    """Проверяет подпись входящего вебхука. data — распарсенное тело с полем sign."""
    received = data.get("sign", "")
    if not received:
        return False
    payload = {k: v for k, v in data.items() if k != "sign"}
    expected = _sign(_php_json(payload))
    return hmac.compare_digest(received, expected)
