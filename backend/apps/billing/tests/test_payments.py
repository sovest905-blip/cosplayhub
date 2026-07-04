"""Тесты крипто-оплаты через Crypto Pay (@CryptoBot) — единый шлюз (Pro + донаты).

Crypto Pay: минимум ~$0.01, цена в KZT, без модерации. NOWPayments/Cryptomus — резерв.
"""
import hashlib
import hmac
import json

import pytest

from apps.billing import cryptopay
from apps.billing.models import Payment, Subscription

PAY = "/api/v1/billing/pay/"
CP_HOOK = "/api/v1/billing/cryptopay/webhook/"


@pytest.fixture
def configured(settings):
    settings.CRYPTOPAY_TOKEN = "12345:TESTTOKEN"
    settings.PRO_PRICE = "1990"
    settings.PAY_CURRENCY = "kzt"
    settings.SITE_URL = "https://example.test"
    return settings


def _cp_hook(api, invoice: dict, token="12345:TESTTOKEN"):
    body = json.dumps({"update_type": "invoice_paid", "payload": invoice}).encode()
    secret = hashlib.sha256(token.encode()).digest()
    sig = hmac.new(secret, body, hashlib.sha256).hexdigest()
    return api.generic("POST", CP_HOOK, body, content_type="application/json",
                       **{"HTTP_CRYPTO_PAY_API_SIGNATURE": sig})


# ── Подпись ──────────────────────────────────────────────────────────────────

def test_verify_webhook_roundtrip(configured):
    body = json.dumps({"update_type": "invoice_paid", "payload": {"payload": "o1", "status": "paid"}}).encode()
    secret = hashlib.sha256(b"12345:TESTTOKEN").digest()
    sig = hmac.new(secret, body, hashlib.sha256).hexdigest()
    assert cryptopay.verify_webhook(body, sig) is True


def test_verify_webhook_rejects_tampered(configured):
    body = json.dumps({"a": 1}).encode()
    secret = hashlib.sha256(b"12345:TESTTOKEN").digest()
    sig = hmac.new(secret, body, hashlib.sha256).hexdigest()
    assert cryptopay.verify_webhook(json.dumps({"a": 2}).encode(), sig) is False


# ── Создание платежа ─────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_pro_creates_invoice(api, make_user, configured, monkeypatch):
    monkeypatch.setattr(cryptopay, "create_invoice",
                        lambda **kw: {"invoice_id": 77, "bot_invoice_url": "https://t.me/CryptoBot?start=X"})
    user = make_user()
    api.force_authenticate(user)
    resp = api.post(PAY, {"purpose": "pro", "months": 2}, format="json")
    assert resp.status_code == 201
    assert resp.json()["url"] == "https://t.me/CryptoBot?start=X"
    p = Payment.objects.get(user=user, purpose="pro")
    assert p.gateway == "cryptopay" and p.amount == pytest.approx(3980) and p.invoice_uuid == "77"


@pytest.mark.django_db
def test_donate_creates_invoice(api, configured, monkeypatch):
    monkeypatch.setattr(cryptopay, "create_invoice",
                        lambda **kw: {"invoice_id": 88, "bot_invoice_url": "https://t.me/CryptoBot?start=D"})
    resp = api.post(PAY, {"purpose": "donate_site", "amount": "500"}, format="json")
    assert resp.status_code == 201
    assert Payment.objects.filter(purpose="donate_site", gateway="cryptopay", amount=500).exists()


@pytest.mark.django_db
def test_pro_requires_login(api, configured):
    assert api.post(PAY, {"purpose": "pro"}, format="json").status_code == 401


@pytest.mark.django_db
def test_donate_needs_positive_amount(api, configured, monkeypatch):
    monkeypatch.setattr(cryptopay, "create_invoice", lambda **kw: {"invoice_id": 1, "bot_invoice_url": "u"})
    assert api.post(PAY, {"purpose": "donate_site", "amount": "0"}, format="json").status_code == 400


@pytest.mark.django_db
def test_gated_when_unconfigured(api, make_user, settings):
    settings.CRYPTOPAY_TOKEN = ""
    api.force_authenticate(make_user())
    assert api.post(PAY, {"purpose": "pro"}, format="json").status_code == 503
    assert api.post(PAY, {"purpose": "donate_site", "amount": "500"}, format="json").status_code == 503


# ── Вебхук ───────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_webhook_activates_pro(api, make_user, configured):
    user = make_user()
    Payment.objects.create(user=user, purpose="pro", gateway="cryptopay", amount=1990,
                           currency="kzt", months=2, order_id="cp-pro")
    resp = _cp_hook(api, {"payload": "cp-pro", "status": "paid"})
    assert resp.status_code == 200
    sub = Subscription.objects.get(user=user, plan="pro")
    assert sub.source == "payment" and sub.is_active is True


@pytest.mark.django_db
def test_webhook_marks_donate_paid(api, configured):
    p = Payment.objects.create(purpose="donate_site", gateway="cryptopay", amount=500,
                               currency="kzt", months=1, order_id="cp-don")
    resp = _cp_hook(api, {"payload": "cp-don", "status": "paid"})
    assert resp.status_code == 200
    p.refresh_from_db()
    assert p.status == "paid" and p.paid_at is not None


@pytest.mark.django_db
def test_webhook_bad_sign(api, make_user, configured):
    user = make_user()
    Payment.objects.create(user=user, purpose="pro", gateway="cryptopay", amount=1990,
                           currency="kzt", months=1, order_id="cp-bad")
    body = json.dumps({"update_type": "invoice_paid", "payload": {"payload": "cp-bad", "status": "paid"}}).encode()
    resp = api.generic("POST", CP_HOOK, body, content_type="application/json",
                       **{"HTTP_CRYPTO_PAY_API_SIGNATURE": "deadbeef"})
    assert resp.status_code == 403
    assert not Subscription.objects.filter(user=user).exists()


@pytest.mark.django_db
def test_webhook_idempotent(api, make_user, configured):
    user = make_user()
    Payment.objects.create(user=user, purpose="pro", gateway="cryptopay", amount=1990,
                           currency="kzt", months=1, order_id="cp-idem")
    _cp_hook(api, {"payload": "cp-idem", "status": "paid"})
    first = Subscription.objects.get(user=user, plan="pro").active_until
    _cp_hook(api, {"payload": "cp-idem", "status": "paid"})
    second = Subscription.objects.get(user=user, plan="pro").active_until
    assert first == second
