"""Тесты крипто-оплаты через NOWPayments (единый шлюз для Pro и донатов).

NOWPayments некастодиальный, без модерации; мелкие суммы проходят в дешёвых сетях.
Cryptomus оставлен в коде как резерв — проверяем только его подпись.
"""
import hashlib
import hmac
import json

import pytest

from apps.billing import cryptomus, nowpayments
from apps.billing.models import Payment, Subscription

PAY = "/api/v1/billing/pay/"
NP_HOOK = "/api/v1/billing/nowpayments/webhook/"


@pytest.fixture
def configured(settings):
    """Включает NOWPayments (тестовые ключи)."""
    settings.NOWPAYMENTS_API_KEY = "np-key"
    settings.NOWPAYMENTS_IPN_SECRET = "np-secret"
    settings.PRO_PRICE = "1990"
    settings.PAY_CURRENCY = "kzt"
    settings.SITE_URL = "https://example.test"
    return settings


def _np_sig(data: dict, secret="np-secret") -> str:
    return hmac.new(secret.encode(), nowpayments._sorted_json(data).encode(), hashlib.sha512).hexdigest()


def _np_hook(api, data):
    return api.post(NP_HOOK, data, format="json", HTTP_X_NOWPAYMENTS_SIG=_np_sig(data))


# ── Подписи ──────────────────────────────────────────────────────────────────

def test_nowpayments_verify_roundtrip(configured):
    data = {"order_id": "a", "payment_status": "finished"}
    assert nowpayments.verify_webhook(json.dumps(data).encode(), _np_sig(data)) is True


def test_nowpayments_verify_rejects_tampered(configured):
    good = _np_sig({"order_id": "a", "payment_status": "finished"})
    tampered = json.dumps({"order_id": "a", "payment_status": "failed"}).encode()
    assert nowpayments.verify_webhook(tampered, good) is False


def test_cryptomus_verify_roundtrip(settings):
    settings.CRYPTOMUS_API_KEY = "cm-key"
    payload = {"order_id": "a", "status": "paid"}
    signed = dict(payload); signed["sign"] = cryptomus._sign(cryptomus._php_json(payload))
    assert cryptomus.verify_webhook(signed) is True


# ── Создание платежа (всё через NOWPayments) ─────────────────────────────────

@pytest.mark.django_db
def test_pro_creates_invoice(api, make_user, configured, monkeypatch):
    monkeypatch.setattr(nowpayments, "create_invoice",
                        lambda **kw: {"id": 111, "invoice_url": "https://np/pay"})
    user = make_user()
    api.force_authenticate(user)
    resp = api.post(PAY, {"purpose": "pro", "months": 2}, format="json")
    assert resp.status_code == 201
    assert resp.json()["url"] == "https://np/pay"
    p = Payment.objects.get(user=user, purpose="pro")
    assert p.gateway == "nowpayments"
    assert p.amount == pytest.approx(3980)  # 1990 * 2
    assert p.invoice_uuid == "111"


@pytest.mark.django_db
def test_donate_creates_invoice(api, configured, monkeypatch):
    monkeypatch.setattr(nowpayments, "create_invoice",
                        lambda **kw: {"id": 222, "invoice_url": "https://np/donate"})
    resp = api.post(PAY, {"purpose": "donate_site", "amount": "500"}, format="json")
    assert resp.status_code == 201
    p = Payment.objects.get(purpose="donate_site")
    assert p.gateway == "nowpayments" and p.amount == pytest.approx(500)


@pytest.mark.django_db
def test_pro_requires_login(api, configured):
    assert api.post(PAY, {"purpose": "pro"}, format="json").status_code == 401


@pytest.mark.django_db
def test_donate_needs_positive_amount(api, configured, monkeypatch):
    monkeypatch.setattr(nowpayments, "create_invoice", lambda **kw: {"id": 1, "invoice_url": "https://np/y"})
    assert api.post(PAY, {"purpose": "donate_site", "amount": "0"}, format="json").status_code == 400


@pytest.mark.django_db
def test_gated_when_unconfigured(api, make_user, settings):
    settings.NOWPAYMENTS_API_KEY = ""
    settings.NOWPAYMENTS_IPN_SECRET = ""
    api.force_authenticate(make_user())
    assert api.post(PAY, {"purpose": "pro"}, format="json").status_code == 503
    assert api.post(PAY, {"purpose": "donate_site", "amount": "500"}, format="json").status_code == 503


# ── Вебхук NOWPayments ───────────────────────────────────────────────────────

@pytest.mark.django_db
def test_webhook_activates_pro(api, make_user, configured):
    user = make_user()
    Payment.objects.create(user=user, purpose="pro", gateway="nowpayments", amount=1990,
                           currency="kzt", months=2, order_id="np-ord")
    resp = _np_hook(api, {"order_id": "np-ord", "payment_status": "finished"})
    assert resp.status_code == 200
    sub = Subscription.objects.get(user=user, plan="pro")
    assert sub.source == "payment" and sub.is_active is True


@pytest.mark.django_db
def test_webhook_marks_donate_paid(api, configured):
    p = Payment.objects.create(purpose="donate_site", gateway="nowpayments", amount=500,
                               currency="kzt", months=1, order_id="np-don")
    resp = _np_hook(api, {"order_id": "np-don", "payment_status": "finished"})
    assert resp.status_code == 200
    p.refresh_from_db()
    assert p.status == "paid" and p.paid_at is not None


@pytest.mark.django_db
def test_webhook_bad_sign(api, make_user, configured):
    user = make_user()
    Payment.objects.create(user=user, purpose="pro", gateway="nowpayments", amount=1990,
                           currency="kzt", months=1, order_id="np-bad")
    resp = api.post(NP_HOOK, {"order_id": "np-bad", "payment_status": "finished"},
                    format="json", HTTP_X_NOWPAYMENTS_SIG="deadbeef")
    assert resp.status_code == 403
    assert not Subscription.objects.filter(user=user).exists()


@pytest.mark.django_db
def test_webhook_idempotent(api, make_user, configured):
    user = make_user()
    Payment.objects.create(user=user, purpose="pro", gateway="nowpayments", amount=1990,
                           currency="kzt", months=1, order_id="np-idem")
    _np_hook(api, {"order_id": "np-idem", "payment_status": "finished"})
    first = Subscription.objects.get(user=user, plan="pro").active_until
    _np_hook(api, {"order_id": "np-idem", "payment_status": "finished"})
    second = Subscription.objects.get(user=user, plan="pro").active_until
    assert first == second
