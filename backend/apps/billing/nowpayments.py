"""Тонкий клиент NOWPayments (https://documenter.getpostman.com/view/7907941/S1a32n38).

Некастодиальный шлюз: платёж конвертируется и уходит на выплатной кошелёк мерчанта.
- Авторизация запросов: заголовок `x-api-key: <API_KEY>`.
- Подпись вебхука (IPN): HMAC-SHA512 по JSON-телу, отсортированному по ключам,
  секретом IPN. Приходит в заголовке `x-nowpayments-sig`.
"""
import hashlib
import hmac
import json
import urllib.error
import urllib.request

from django.conf import settings

API_URL = "https://api.nowpayments.io/v1"

# Ошибка вызова шлюза (сеть/HTTP) — вьюха ловит и отдаёт 502.
GatewayError = urllib.error.URLError


def is_configured() -> bool:
    return bool(settings.NOWPAYMENTS_API_KEY and settings.NOWPAYMENTS_IPN_SECRET)


def create_invoice(*, amount, currency, order_id, description, ipn_callback_url, success_url, cancel_url):
    """Создаёт хостед-инвойс, возвращает dict ответа (в т.ч. id и invoice_url)."""
    payload = {
        "price_amount": float(amount),
        "price_currency": currency.lower(),
        "order_id": order_id,
        "order_description": description,
        "ipn_callback_url": ipn_callback_url,
        "success_url": success_url,
        "cancel_url": cancel_url,
    }
    body = json.dumps(payload).encode()
    req = urllib.request.Request(
        f"{API_URL}/invoice", data=body, method="POST",
        headers={"x-api-key": settings.NOWPAYMENTS_API_KEY, "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode())


def _sorted_json(data: dict) -> str:
    """JSON с сортировкой ключей (в т.ч. вложенных) — так NOWPayments считает подпись."""
    return json.dumps(data, sort_keys=True, separators=(",", ":"))


def verify_webhook(raw_body: bytes, signature: str) -> bool:
    """Проверяет подпись IPN. raw_body — сырое тело запроса, signature — x-nowpayments-sig."""
    if not signature:
        return False
    try:
        data = json.loads(raw_body.decode())
    except (ValueError, UnicodeDecodeError):
        return False
    expected = hmac.new(
        settings.NOWPAYMENTS_IPN_SECRET.encode(),
        _sorted_json(data).encode(),
        hashlib.sha512,
    ).hexdigest()
    return hmac.compare_digest(signature, expected)
