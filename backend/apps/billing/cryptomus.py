"""Тонкий клиент Cryptomus (https://doc.cryptomus.com/).

Подпись запроса/вебхука: md5( base64( JSON-тело ) + API_KEY ).
JSON кодируется как в PHP json_encode (Cryptomus на PHP): без пробелов,
не-ASCII экранируется \\uXXXX, слэши экранируются \\/. Именно эти байты
и подписываются, и ровно они уходят в теле запроса — иначе подпись не сойдётся.
"""
import base64
import hashlib
import hmac
import json
import urllib.error
import urllib.request

from django.conf import settings

API_URL = "https://api.cryptomus.com/v1"

# Ошибка вызова платёжного шлюза (сеть/HTTP) — вьюха ловит её и отдаёт 502.
GatewayError = urllib.error.URLError


def is_configured() -> bool:
    return bool(settings.CRYPTOMUS_MERCHANT_ID and settings.CRYPTOMUS_API_KEY)


def _php_json(payload: dict) -> str:
    """Сериализация, совпадающая с PHP json_encode (компакт + экранирование слэшей)."""
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
    body = _php_json(payload).encode()
    req = urllib.request.Request(
        f"{API_URL}/payment", data=body, method="POST",
        headers={
            "merchant": settings.CRYPTOMUS_MERCHANT_ID,
            "sign": _sign(_php_json(payload)),
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        data = json.loads(resp.read().decode())
    return data.get("result", {})


def verify_webhook(data: dict) -> bool:
    """Проверяет подпись входящего вебхука. data — распарсенное тело с полем sign."""
    received = data.get("sign", "")
    if not received:
        return False
    payload = {k: v for k, v in data.items() if k != "sign"}
    expected = _sign(_php_json(payload))
    # сравнение, устойчивое ко времени
    return hmac.compare_digest(received, expected)
