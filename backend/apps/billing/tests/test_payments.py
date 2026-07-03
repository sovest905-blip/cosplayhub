"""Тесты крипто-оплаты через Cryptomus (единый шлюз для Pro и донатов).

Проверяем создание инвойса, подпись вебхука, активацию Pro, идемпотентность, гейтинг.
NOWPayments оставлен в коде как резерв — проверяем только его подпись.
"""
import hashlib
import hmac
import json

import pytest

from apps.billing import cryptomus, nowpayments
from apps.billing.models import Payment, Subscription

PAY = "/api/v1/billing/pay/"
CM_HOOK = "/api/v1/billing/cryptomus/webhook/"


@pytest.fixture
def configured(settings):
    """Включает Cryptomus (тестовые ключи)."""
    settings.CRYPTOMUS_MERCHANT_ID = "cm-merchant"
    settings.CRYPTOMUS_API_KEY = "cm-key"
    settings.PRO_PRICE = "1990"
    settings.PAY_CURRENCY = "kzt"
    settings.SITE_URL = "https://example.test"
    return settings


def _cm_signed(payload: dict) -> dict:
    data = dict(payload)
    data["sign"] = cryptomus._sign(cryptomus._php_json(payload))
    return data


# ── Подписи ──────────────────────────────────────────────────────────────────

def test_cryptomus_verify_roundtrip(configured):
    assert cryptomus.verify_webhook(_cm_signed({"order_id": "a", "status": "paid"})) is True


def test_cryptomus_verify_rejects_tampered(configured):
    signed = _cm_signed({"order_id": "a", "status": "paid"})
    signed["status"] = "fail"
    assert cryptomus.verify_webhook(signed) is False


def test_nowpayments_verify_roundtrip(settings):
    settings.NOWPAYMENTS_IPN_SECRET = "np-secret"
    data = {"order_id": "a", "payment_status": "finished"}
    sig = hmac.new(b"np-secret", nowpayments._sorted_json(data).encode(), hashlib.sha512).hexdigest()
    assert nowpayments.verify_webhook(json.dumps(data).encode(), sig) is True


# ── Создание платежа (всё через Cryptomus) ───────────────────────────────────

@pytest.mark.django_db
def test_pro_creates_cryptomus_invoice(api, make_user, configured, monkeypatch):
    monkeypatch.setattr(cryptomus, "create_invoice",
                        lambda **kw: {"uuid": "cm-1", "url": "https://cm/pay"})
    user = make_user()
    api.force_authenticate(user)
    resp = api.post(PAY, {"purpose": "pro", "months": 2}, format="json")
    assert resp.status_code == 201
    assert resp.json()["url"] == "https://cm/pay"
    p = Payment.objects.get(user=user, purpose="pro")
    assert p.gateway == "cryptomus"
    assert p.amount == pytest.approx(3980)  # 1990 * 2
    assert p.invoice_uuid == "cm-1"


@pytest.mark.django_db
def test_donate_creates_cryptomus_invoice(api, configured, monkeypatch):
    monkeypatch.setattr(cryptomus, "create_invoice",
                        lambda **kw: {"uuid": "cm-2", "url": "https://cm/donate"})
    resp = api.post(PAY, {"purpose": "donate_site", "amount": "500"}, format="json")
    assert resp.status_code == 201
    p = Payment.objects.get(purpose="donate_site")
    assert p.gateway == "cryptomus" and p.amount == pytest.approx(500)


@pytest.mark.django_db
def test_pro_requires_login(api, configured):
    assert api.post(PAY, {"purpose": "pro"}, format="json").status_code == 401


@pytest.mark.django_db
def test_donate_needs_positive_amount(api, configured, monkeypatch):
    monkeypatch.setattr(cryptomus, "create_invoice", lambda **kw: {"uuid": "x", "url": "https://cm/y"})
    assert api.post(PAY, {"purpose": "donate_site", "amount": "0"}, format="json").status_code == 400


@pytest.mark.django_db
def test_gated_when_unconfigured(api, make_user, settings):
    settings.CRYPTOMUS_MERCHANT_ID = ""
    settings.CRYPTOMUS_API_KEY = ""
    api.force_authenticate(make_user())
    assert api.post(PAY, {"purpose": "pro"}, format="json").status_code == 503
    assert api.post(PAY, {"purpose": "donate_site", "amount": "500"}, format="json").status_code == 503


# ── Вебхук Cryptomus ─────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_webhook_activates_pro(api, make_user, configured):
    user = make_user()
    Payment.objects.create(user=user, purpose="pro", gateway="cryptomus", amount=1990,
                           currency="kzt", months=2, order_id="ord-pro")
    resp = api.post(CM_HOOK, _cm_signed({"order_id": "ord-pro", "status": "paid"}), format="json")
    assert resp.status_code == 200
    sub = Subscription.objects.get(user=user, plan="pro")
    assert sub.source == "payment" and sub.is_active is True


@pytest.mark.django_db
def test_webhook_marks_donate_paid(api, configured):
    p = Payment.objects.create(purpose="donate_site", gateway="cryptomus", amount=500,
                               currency="kzt", months=1, order_id="ord-don")
    resp = api.post(CM_HOOK, _cm_signed({"order_id": "ord-don", "status": "paid"}), format="json")
    assert resp.status_code == 200
    p.refresh_from_db()
    assert p.status == "paid" and p.paid_at is not None


@pytest.mark.django_db
def test_webhook_bad_sign(api, configured):
    Payment.objects.create(purpose="donate_site", gateway="cryptomus", amount=500,
                           currency="kzt", months=1, order_id="ord-bad")
    resp = api.post(CM_HOOK, {"order_id": "ord-bad", "status": "paid", "sign": "bad"}, format="json")
    assert resp.status_code == 403


@pytest.mark.django_db
def test_webhook_idempotent(api, make_user, configured):
    user = make_user()
    Payment.objects.create(user=user, purpose="pro", gateway="cryptomus", amount=1990,
                           currency="kzt", months=1, order_id="ord-idem")
    api.post(CM_HOOK, _cm_signed({"order_id": "ord-idem", "status": "paid"}), format="json")
    first = Subscription.objects.get(user=user, plan="pro").active_until
    api.post(CM_HOOK, _cm_signed({"order_id": "ord-idem", "status": "paid"}), format="json")
    second = Subscription.objects.get(user=user, plan="pro").active_until
    assert first == second
