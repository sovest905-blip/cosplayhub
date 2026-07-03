"""Тесты крипто-оплаты через NOWPayments: подпись IPN, инвойс, вебхук, идемпотентность."""
import hashlib
import hmac

import pytest

from apps.billing import nowpayments
from apps.billing.models import Payment, Subscription

PAY = "/api/v1/billing/pay/"
HOOK = "/api/v1/billing/nowpayments/webhook/"


@pytest.fixture
def configured(settings):
    """Включает NOWPayments в настройках (тестовые ключи)."""
    settings.NOWPAYMENTS_API_KEY = "test-api-key"
    settings.NOWPAYMENTS_IPN_SECRET = "test-ipn-secret"
    settings.PRO_PRICE = "5"
    settings.PAY_CURRENCY = "usd"
    settings.SITE_URL = "https://example.test"
    return settings


def _sig(data: dict, secret="test-ipn-secret") -> str:
    """Подпись IPN, как её считает NOWPayments (HMAC-SHA512 по sorted-JSON)."""
    return hmac.new(secret.encode(), nowpayments._sorted_json(data).encode(), hashlib.sha512).hexdigest()


def _post_hook(api, data):
    return api.post(HOOK, data, format="json", HTTP_X_NOWPAYMENTS_SIG=_sig(data))


# ── Подпись ──────────────────────────────────────────────────────────────────

def test_verify_webhook_roundtrip(configured):
    import json
    data = {"order_id": "abc", "payment_status": "finished", "price_amount": 5}
    raw = json.dumps(data).encode()
    assert nowpayments.verify_webhook(raw, _sig(data)) is True


def test_verify_webhook_rejects_tampered(configured):
    import json
    data = {"order_id": "abc", "payment_status": "finished"}
    good_sig = _sig(data)
    tampered = json.dumps({"order_id": "abc", "payment_status": "failed"}).encode()
    assert nowpayments.verify_webhook(tampered, good_sig) is False


def test_verify_webhook_no_signature(configured):
    assert nowpayments.verify_webhook(b"{}", "") is False


# ── Создание платежа ─────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_pay_unconfigured_returns_503(api, make_user, settings):
    settings.NOWPAYMENTS_API_KEY = ""
    settings.NOWPAYMENTS_IPN_SECRET = ""
    api.force_authenticate(make_user())
    resp = api.post(PAY, {"purpose": "pro"}, format="json")
    assert resp.status_code == 503


@pytest.mark.django_db
def test_pay_pro_creates_invoice(api, make_user, configured, monkeypatch):
    monkeypatch.setattr(nowpayments, "create_invoice",
                        lambda **kw: {"id": 12345, "invoice_url": "https://nowpayments.io/payment/?iid=12345"})
    user = make_user()
    api.force_authenticate(user)
    resp = api.post(PAY, {"purpose": "pro", "months": 3}, format="json")
    assert resp.status_code == 201
    assert resp.json()["url"] == "https://nowpayments.io/payment/?iid=12345"

    p = Payment.objects.get(user=user, purpose="pro")
    assert p.months == 3
    assert p.amount == pytest.approx(15)  # 5 * 3
    assert p.status == "pending"
    assert p.invoice_uuid == "12345"


@pytest.mark.django_db
def test_pay_pro_requires_login(api, configured):
    resp = api.post(PAY, {"purpose": "pro"}, format="json")
    assert resp.status_code == 401


@pytest.mark.django_db
def test_pay_donate_site_needs_positive_amount(api, configured, monkeypatch):
    monkeypatch.setattr(nowpayments, "create_invoice",
                        lambda **kw: {"id": 2, "invoice_url": "https://nowpayments.io/payment/?iid=2"})
    resp = api.post(PAY, {"purpose": "donate_site", "amount": "0"}, format="json")
    assert resp.status_code == 400
    resp = api.post(PAY, {"purpose": "donate_site", "amount": "10"}, format="json")
    assert resp.status_code == 201
    assert Payment.objects.filter(purpose="donate_site", amount=10).exists()


# ── Вебхук ───────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_webhook_finished_activates_pro(api, make_user, configured):
    user = make_user()
    p = Payment.objects.create(user=user, purpose="pro", amount=10, currency="usd",
                               months=2, order_id="ord-1")
    resp = _post_hook(api, {"order_id": "ord-1", "payment_status": "finished", "price_amount": 10})
    assert resp.status_code == 200

    p.refresh_from_db()
    assert p.status == "paid"
    assert p.paid_at is not None
    sub = Subscription.objects.get(user=user, plan="pro")
    assert sub.source == "payment"
    assert sub.is_active is True


@pytest.mark.django_db
def test_webhook_is_idempotent(api, make_user, configured):
    user = make_user()
    Payment.objects.create(user=user, purpose="pro", amount=5, currency="usd",
                           months=1, order_id="ord-2")
    _post_hook(api, {"order_id": "ord-2", "payment_status": "finished"})
    first = Subscription.objects.get(user=user, plan="pro").active_until
    _post_hook(api, {"order_id": "ord-2", "payment_status": "finished"})
    second = Subscription.objects.get(user=user, plan="pro").active_until
    assert first == second


@pytest.mark.django_db
def test_webhook_bad_sign_rejected(api, make_user, configured):
    user = make_user()
    Payment.objects.create(user=user, purpose="pro", amount=5, currency="usd",
                           months=1, order_id="ord-3")
    resp = api.post(HOOK, {"order_id": "ord-3", "payment_status": "finished"},
                    format="json", HTTP_X_NOWPAYMENTS_SIG="deadbeef")
    assert resp.status_code == 403
    assert not Subscription.objects.filter(user=user).exists()
