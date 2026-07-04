"""Клиент Crypto Pay (@CryptoBot, https://pay.crypt.bot/) — основной шлюз.

Telegram-нативный, без модерации мерчанта, минимум ~$0.01, принимает цену в фиате
(KZT). Оплата идёт в Telegram через @CryptoBot. Кастодиал (баланс в Crypto Pay,
вывод отдельно). Подпись вебхука: HMAC-SHA256(тело, ключ=SHA256(token)).
"""
import hashlib
import hmac
import json
import urllib.error
import urllib.parse
import urllib.request

from django.conf import settings

API_URL = "https://pay.crypt.bot/api"
USER_AGENT = "CosplayHub/1.0 (+https://cosplayhub.kz)"

GatewayError = urllib.error.URLError


def is_configured() -> bool:
    return bool(settings.CRYPTOPAY_TOKEN)


def _call(method: str, params: dict) -> dict:
    body = urllib.parse.urlencode(params).encode()
    req = urllib.request.Request(
        f"{API_URL}/{method}", data=body, method="POST",
        headers={
            "Crypto-Pay-API-Token": settings.CRYPTOPAY_TOKEN,
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": USER_AGENT,
        },
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode())


def create_invoice(*, amount, fiat, description, payload, paid_btn_url):
    """Создаёт фиатный инвойс. Возвращает result{} (invoice_id, bot_invoice_url)."""
    params = {
        "currency_type": "fiat",
        "fiat": fiat,
        "amount": str(amount),
        "description": description[:1024],
        "payload": payload,
        "paid_btn_name": "callback",
        "paid_btn_url": paid_btn_url,
    }
    data = _call("createInvoice", params)
    return data.get("result", {})


def verify_webhook(raw_body: bytes, signature: str) -> bool:
    """Проверяет подпись вебхука: HMAC-SHA256(тело) с ключом SHA256(token)."""
    if not signature:
        return False
    secret = hashlib.sha256(settings.CRYPTOPAY_TOKEN.encode()).digest()
    expected = hmac.new(secret, raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(signature, expected)
