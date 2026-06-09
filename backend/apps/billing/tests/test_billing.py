"""Тесты подписок: активация триала, идемпотентность, владение, срок, констрейнты."""
import pytest
from django.db import IntegrityError
from django.db.utils import DataError
from django.utils import timezone

from apps.billing.models import Subscription, TRIAL_MONTHS, add_months

ACTIVATE = "/api/v1/billing/activate/"
MY = "/api/v1/billing/me/"


# ── Активация Pro профиля ────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_activate_pro_creates_trial(api, make_user):
    user = make_user()
    api.force_authenticate(user=user)
    resp = api.post(ACTIVATE, {"plan": "pro"})
    assert resp.status_code == 201

    sub = Subscription.objects.get(user=user, plan="pro")
    assert sub.workshop is None
    assert sub.source == "trial"
    assert sub.is_active is True
    # Срок ≈ сейчас + TRIAL_MONTHS месяцев.
    assert sub.active_until.date() == add_months(timezone.now(), TRIAL_MONTHS).date()


@pytest.mark.django_db
def test_activate_pro_is_idempotent(api, make_user):
    user = make_user()
    api.force_authenticate(user=user)
    first = api.post(ACTIVATE, {"plan": "pro"})
    second = api.post(ACTIVATE, {"plan": "pro"})
    assert first.status_code == 201   # создано
    assert second.status_code == 200  # уже было
    assert Subscription.objects.filter(user=user, plan="pro").count() == 1


@pytest.mark.django_db
def test_activate_unknown_plan_rejected(api, make_user):
    user = make_user()
    api.force_authenticate(user=user)
    assert api.post(ACTIVATE, {"plan": "gold"}).status_code == 400


@pytest.mark.django_db
def test_activate_requires_auth(api):
    assert api.post(ACTIVATE, {"plan": "pro"}).status_code == 403


# ── Тариф мастерской: только своей ────────────────────────────────────────────────

@pytest.mark.django_db
def test_activate_workshop_tariff_for_own(api, make_user, make_workshop):
    owner = make_user()
    ws = make_workshop(owner=owner)
    api.force_authenticate(user=owner)
    resp = api.post(ACTIVATE, {"plan": "workshop", "workshop": ws.id})
    assert resp.status_code == 201
    ws.refresh_from_db()
    assert ws.is_pro is True  # property считает активную подписку


@pytest.mark.django_db
def test_cannot_activate_foreign_workshop(api, make_user, make_workshop):
    owner = make_user(username="o1", email="o1@example.com")
    intruder = make_user(username="o2", email="o2@example.com")
    ws = make_workshop(owner=owner)
    api.force_authenticate(user=intruder)
    resp = api.post(ACTIVATE, {"plan": "workshop", "workshop": ws.id})
    assert resp.status_code == 404
    assert not Subscription.objects.filter(workshop=ws).exists()


# ── Срок действия (без крона) ─────────────────────────────────────────────────────

@pytest.mark.django_db
def test_expired_subscription_is_not_active(make_user):
    user = make_user()
    sub = Subscription.objects.create(
        user=user, plan="pro", source="trial",
        active_until=timezone.now() - timezone.timedelta(days=1),
    )
    assert sub.is_active is False
    assert sub.status == "expired"


@pytest.mark.django_db
def test_unlimited_subscription_is_active(make_user):
    user = make_user()
    sub = Subscription.objects.create(user=user, plan="pro", source="manual", active_until=None)
    assert sub.is_active is True  # NULL = бессрочно


@pytest.mark.django_db
def test_disabled_subscription_is_not_active(make_user):
    user = make_user()
    sub = Subscription.objects.create(user=user, plan="pro", active_until=None, disabled=True)
    assert sub.is_active is False
    assert sub.status == "disabled"


# ── Констрейнт uniq_user_pro (тот, что синхронизировали миграцией) ────────────────

@pytest.mark.django_db
def test_uniq_user_pro_constraint(make_user):
    """Нельзя завести две Pro-подписки профиля одному юзеру."""
    user = make_user()
    Subscription.objects.create(user=user, plan="pro", workshop=None)
    with pytest.raises((IntegrityError, DataError)):
        Subscription.objects.create(user=user, plan="pro", workshop=None)


# ── Список своих подписок ─────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_my_subscriptions_lists_only_own(api, make_user):
    user = make_user(username="me", email="me@example.com")
    other = make_user(username="notme", email="notme@example.com")
    Subscription.objects.create(user=user, plan="pro")
    Subscription.objects.create(user=other, plan="pro")

    api.force_authenticate(user=user)
    resp = api.get(MY)
    assert resp.status_code == 200
    assert len(resp.data) == 1
