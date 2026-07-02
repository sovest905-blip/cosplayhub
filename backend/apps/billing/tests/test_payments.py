"""Тесты крипто-оплаты через Cryptomus: подпись, создание инвойса, вебхук, идемпотентность."""
import pytest

from apps.billing import cryptomus
from apps.billing.models import Payment, Subscription

PAY = "/api/v1/billing/pay/"
HOOK = "/api/v1/billing/cryptomus/webhook/"


@pytest.fixture
def configured(settings):
    """Включает Cryptomus в настройках (тестовые ключи)."""
    settings.CRYPTOMUS_MERCHANT_ID = "test-merchant"
    settings.CRYPTOMUS_API_KEY = "test-key"
    settings.PRO_PRICE = "5"
    settings.PAY_CURRENCY = "USD"
    settings.SITE_URL = "https://example.test"
    return settings


def _signed(payload: dict) -> dict:
    """Добавляет корректную подпись к телу вебхука (как это делает Cryptomus)."""
    data = dict(payload)
    data["sign"] = cryptomus._sign(cryptomus._php_json(payload))
    return data


# ── Подпись ──────────────────────────────────────────────────────────────────

def test_verify_webhook_roundtrip(configured):
    payload = {"order_id": "abc", "status": "paid", "amount": "5", "currency": "USD"}
    assert cryptomus.verify_webhook(_signed(payload)) is True


def test_verify_webhook_rejects_tampered(configured):
    signed = _signed({"order_id": "abc", "status": "paid"})
    signed["status"] = "fail"  # подменили после подписи
    assert cryptomus.verify_webhook(signed) is False


# ── Создание платежа ─────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_pay_unconfigured_returns_503(api, make_user, settings):
    settings.CRYPTOMUS_MERCHANT_ID = ""
    settings.CRYPTOMUS_API_KEY = ""
    api.force_authenticate(make_user())
    resp = api.post(PAY, {"purpose": "pro"}, format="json")
    assert resp.status_code == 503


@pytest.mark.django_db
def test_pay_pro_creates_invoice(api, make_user, configured, monkeypatch):
    monkeypatch.setattr(cryptomus, "create_invoice",
                        lambda **kw: {"uuid": "cm-1", "url": "https://pay.cryptomus.com/x"})
    user = make_user()
    api.force_authenticate(user)
    resp = api.post(PAY, {"purpose": "pro", "months": 3}, format="json")
    assert resp.status_code == 201
    assert resp.json()["url"] == "https://pay.cryptomus.com/x"

    p = Payment.objects.get(user=user, purpose="pro")
    assert p.months == 3
    assert p.amount == pytest.approx(15)  # 5 * 3
    assert p.status == "pending"
    assert p.invoice_uuid == "cm-1"


@pytest.mark.django_db
def test_pay_pro_requires_login(api, configured):
    resp = api.post(PAY, {"purpose": "pro"}, format="json")
    assert resp.status_code == 401


@pytest.mark.django_db
def test_pay_donate_site_needs_positive_amount(api, configured, monkeypatch):
    monkeypatch.setattr(cryptomus, "create_invoice",
                        lambda **kw: {"uuid": "cm-2", "url": "https://pay/y"})
    # аноним может донатить сайту
    resp = api.post(PAY, {"purpose": "donate_site", "amount": "0"}, format="json")
    assert resp.status_code == 400
    resp = api.post(PAY, {"purpose": "donate_site", "amount": "10"}, format="json")
    assert resp.status_code == 201
    assert Payment.objects.filter(purpose="donate_site", amount=10).exists()


# ── Вебхук ───────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_webhook_paid_activates_pro(api, make_user, configured):
    user = make_user()
    p = Payment.objects.create(user=user, purpose="pro", amount=10, currency="USD",
                               months=2, order_id="ord-1")
    body = _signed({"order_id": "ord-1", "status": "paid", "uuid": "cm-9", "amount": "10"})
    resp = api.post(HOOK, body, format="json")
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
    Payment.objects.create(user=user, purpose="pro", amount=5, currency="USD",
                           months=1, order_id="ord-2")
    body = _signed({"order_id": "ord-2", "status": "paid", "amount": "5"})
    api.post(HOOK, body, format="json")
    first = Subscription.objects.get(user=user, plan="pro").active_until
    # повторный вебхук не должен продлить второй раз
    api.post(HOOK, body, format="json")
    second = Subscription.objects.get(user=user, plan="pro").active_until
    assert first == second


@pytest.mark.django_db
def test_webhook_bad_sign_rejected(api, make_user, configured):
    user = make_user()
    Payment.objects.create(user=user, purpose="pro", amount=5, currency="USD",
                           months=1, order_id="ord-3")
    resp = api.post(HOOK, {"order_id": "ord-3", "status": "paid", "sign": "deadbeef"}, format="json")
    assert resp.status_code == 403
    assert not Subscription.objects.filter(user=user).exists()
