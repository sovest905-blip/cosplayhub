"""Тесты веб-админпанели (/api/v1/admin-panel/...): доступ только staff,
правила самозащиты (нельзя тронуть себя/суперюзера) и ключевые операции."""
import pytest

from apps.billing.models import Subscription
from apps.listings.models import Listing
from apps.orders.models import Order
from apps.users.models import User
from apps.workshops.models import Workshop

AP = "/api/v1/admin-panel"


@pytest.fixture
def staff(make_user):
    return make_user(username="admin1", email="admin1@example.com", is_staff=True)


# ── Граница доступа: только staff ────────────────────────────────────────────────

GUARDED = [
    f"{AP}/users/",
    f"{AP}/stats/",
    f"{AP}/listings/",
    f"{AP}/products/",
    f"{AP}/orders/",
    f"{AP}/subscriptions/",
]


@pytest.mark.django_db
@pytest.mark.parametrize("url", GUARDED)
def test_anon_forbidden(api, url):
    assert api.get(url).status_code == 403


@pytest.mark.django_db
@pytest.mark.parametrize("url", GUARDED)
def test_regular_user_forbidden(api, make_user, url):
    api.force_authenticate(user=make_user())
    assert api.get(url).status_code == 403


@pytest.mark.django_db
def test_staff_allowed(api, staff):
    api.force_authenticate(user=staff)
    assert api.get(f"{AP}/users/").status_code == 200


# ── Управление пользователями ────────────────────────────────────────────────────

@pytest.mark.django_db
def test_create_user(api, staff):
    api.force_authenticate(user=staff)
    resp = api.post(f"{AP}/users/", {
        "username": "newbie", "identifier": "newbie@example.com", "password": "Cosplay2026!",
    }, format="json")
    assert resp.status_code == 201
    u = User.objects.get(username="newbie")
    assert u.email == "newbie@example.com" and u.is_email_verified is True


@pytest.mark.django_db
def test_create_user_duplicate_username(api, staff, make_user):
    make_user(username="taken", email="t@example.com")
    api.force_authenticate(user=staff)
    resp = api.post(f"{AP}/users/", {
        "username": "taken", "identifier": "x@example.com", "password": "Cosplay2026!",
    }, format="json")
    assert resp.status_code == 400


@pytest.mark.django_db
def test_block_user(api, staff, make_user):
    victim = make_user(username="v", email="v@example.com")
    api.force_authenticate(user=staff)
    resp = api.post(f"{AP}/users/{victim.id}/set-active/", {"is_active": False}, format="json")
    assert resp.status_code == 200
    victim.refresh_from_db()
    assert victim.is_active is False


@pytest.mark.django_db
def test_cannot_block_self(api, staff):
    api.force_authenticate(user=staff)
    resp = api.post(f"{AP}/users/{staff.id}/set-active/", {"is_active": False}, format="json")
    assert resp.status_code == 400
    staff.refresh_from_db()
    assert staff.is_active is True


@pytest.mark.django_db
def test_grant_and_revoke_staff(api, staff, make_user):
    user = make_user(username="u", email="u@example.com")
    api.force_authenticate(user=staff)
    api.post(f"{AP}/users/{user.id}/set-staff/", {"is_staff": True}, format="json")
    user.refresh_from_db()
    assert user.is_staff is True


@pytest.mark.django_db
def test_cannot_destaff_self(api, staff):
    api.force_authenticate(user=staff)
    resp = api.post(f"{AP}/users/{staff.id}/set-staff/", {"is_staff": False}, format="json")
    assert resp.status_code == 400


@pytest.mark.django_db
def test_cannot_delete_self(api, staff):
    api.force_authenticate(user=staff)
    assert api.delete(f"{AP}/users/{staff.id}/delete/").status_code == 400


@pytest.mark.django_db
def test_delete_user(api, staff, make_user):
    victim = make_user(username="v", email="v@example.com")
    api.force_authenticate(user=staff)
    assert api.delete(f"{AP}/users/{victim.id}/delete/").status_code == 204
    assert not User.objects.filter(id=victim.id).exists()


@pytest.mark.django_db
def test_cannot_target_superuser(api, staff):
    """Суперюзер не виден админ-панели (_get_user фильтрует is_superuser=False) → 404."""
    su = User.objects.create_superuser(username="root", email="root@example.com", password="Cosplay2026!")
    api.force_authenticate(user=staff)
    assert api.post(f"{AP}/users/{su.id}/set-active/", {"is_active": False}, format="json").status_code == 404


@pytest.mark.django_db
def test_reset_password(api, staff, make_user):
    user = make_user(username="u", email="u@example.com")
    api.force_authenticate(user=staff)
    resp = api.post(f"{AP}/users/{user.id}/reset-password/", {"password": "BrandNew2027!"}, format="json")
    assert resp.status_code == 200
    user.refresh_from_db()
    assert user.check_password("BrandNew2027!")


@pytest.mark.django_db
def test_reset_password_too_weak(api, staff, make_user):
    user = make_user(username="u", email="u@example.com")
    api.force_authenticate(user=staff)
    assert api.post(f"{AP}/users/{user.id}/reset-password/", {"password": "123"}, format="json").status_code == 400


# ── Модерация контента ───────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_hide_listing(api, staff, make_user):
    lst = Listing.objects.create(user=make_user(), title="спам", type="sell", is_active=True)
    api.force_authenticate(user=staff)
    resp = api.post(f"{AP}/listings/{lst.id}/set-active/", {"is_active": False}, format="json")
    assert resp.status_code == 200
    lst.refresh_from_db()
    assert lst.is_active is False


@pytest.mark.django_db
def test_change_order_status(api, staff, make_user):
    customer = make_user(username="c", email="c@example.com")
    owner = make_user(username="o", email="o@example.com")
    ws = Workshop.objects.create(owner=owner, name="Цех", type="eva", city="Алматы")
    order = Order.objects.create(customer=customer, workshop=ws, description="x")
    api.force_authenticate(user=staff)
    resp = api.post(f"{AP}/orders/{order.id}/set-status/", {"status": "done"}, format="json")
    assert resp.status_code == 200
    order.refresh_from_db()
    assert order.status == "done"


@pytest.mark.django_db
def test_change_order_invalid_status(api, staff, make_user):
    customer = make_user(username="c", email="c@example.com")
    owner = make_user(username="o", email="o@example.com")
    ws = Workshop.objects.create(owner=owner, name="Цех", type="eva", city="Алматы")
    order = Order.objects.create(customer=customer, workshop=ws, description="x")
    api.force_authenticate(user=staff)
    assert api.post(f"{AP}/orders/{order.id}/set-status/", {"status": "wat"}, format="json").status_code == 400


# ── Подписки Pro (billing) ───────────────────────────────────────────────────────

@pytest.mark.django_db
def test_grant_pro_subscription(api, staff, make_user):
    user = make_user(username="u", email="u@example.com")
    api.force_authenticate(user=staff)
    resp = api.post(f"{AP}/subscriptions/", {"user_id": user.id, "plan": "pro", "months": 6}, format="json")
    assert resp.status_code == 201
    sub = Subscription.objects.get(user=user, plan="pro")
    assert sub.is_active is True and sub.source == "manual"


@pytest.mark.django_db
def test_grant_unlimited_pro(api, staff, make_user):
    user = make_user(username="u", email="u@example.com")
    api.force_authenticate(user=staff)
    api.post(f"{AP}/subscriptions/", {"user_id": user.id, "plan": "pro", "unlimited": True}, format="json")
    sub = Subscription.objects.get(user=user, plan="pro")
    assert sub.active_until is None and sub.is_active is True  # бессрочно


@pytest.mark.django_db
def test_delete_subscription(api, staff, make_user):
    user = make_user(username="u", email="u@example.com")
    sub = Subscription.objects.create(user=user, plan="pro")
    api.force_authenticate(user=staff)
    assert api.delete(f"{AP}/subscriptions/{sub.id}/").status_code == 204
    assert not Subscription.objects.filter(id=sub.id).exists()
