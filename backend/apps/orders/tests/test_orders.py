"""Тесты заказов: изоляция по владельцу (ИБ) и переходы статусов."""
import pytest

from apps.notifications.models import Notification
from apps.orders.models import Order

ORDERS = "/api/v1/orders/"
INCOMING = "/api/v1/orders/incoming/"


@pytest.fixture
def setup(make_user, make_workshop):
    """Заказчик, владелец мастерской и сама мастерская."""
    customer = make_user(username="customer", email="cust@example.com")
    owner = make_user(username="owner", email="owner@example.com")
    workshop = make_workshop(owner=owner, name="ЭВА-цех")
    return customer, owner, workshop


# ── Создание ────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_create_order_sets_customer_and_notifies_owner(api, setup):
    customer, owner, workshop = setup
    api.force_authenticate(user=customer)
    resp = api.post(ORDERS, {"workshop": workshop.id, "description": "Нужен шлем"})
    assert resp.status_code == 201

    order = Order.objects.get()
    assert order.customer == customer          # customer проставляется из request.user
    assert order.status == "request"
    # Владелец мастерской получил уведомление о заявке.
    assert Notification.objects.filter(recipient=owner, kind="order_new").exists()


@pytest.mark.django_db
def test_create_order_requires_auth(api, setup):
    _, _, workshop = setup
    resp = api.post(ORDERS, {"workshop": workshop.id, "description": "x"})
    assert resp.status_code == 403


# ── Изоляция по владельцу (ИБ) ──────────────────────────────────────────────────

@pytest.mark.django_db
def test_user_sees_only_own_orders(api, setup, make_user):
    customer, owner, workshop = setup
    other = make_user(username="other", email="other@example.com")
    Order.objects.create(customer=customer, workshop=workshop, description="мой")
    Order.objects.create(customer=other, workshop=workshop, description="чужой")

    api.force_authenticate(user=customer)
    resp = api.get(ORDERS)
    assert resp.status_code == 200
    results = resp.data["results"] if isinstance(resp.data, dict) else resp.data
    assert len(results) == 1
    assert results[0]["description"] == "мой"


@pytest.mark.django_db
def test_cannot_retrieve_foreign_order(api, setup, make_user):
    customer, owner, workshop = setup
    other = make_user(username="other2", email="other2@example.com")
    foreign = Order.objects.create(customer=other, workshop=workshop, description="секрет")

    api.force_authenticate(user=customer)
    assert api.get(f"{ORDERS}{foreign.id}/").status_code == 404


# ── Входящие + переходы статусов ────────────────────────────────────────────────

@pytest.mark.django_db
def test_owner_sees_incoming_orders(api, setup):
    customer, owner, workshop = setup
    Order.objects.create(customer=customer, workshop=workshop, description="заявка")
    api.force_authenticate(user=owner)
    resp = api.get(INCOMING)
    assert resp.status_code == 200
    assert len(resp.data) == 1


@pytest.mark.django_db
def test_valid_status_transition(api, setup):
    customer, owner, workshop = setup
    order = Order.objects.create(customer=customer, workshop=workshop, description="z")
    api.force_authenticate(user=owner)
    resp = api.patch(f"{INCOMING}{order.id}/", {"status": "accepted"})
    assert resp.status_code == 200
    order.refresh_from_db()
    assert order.status == "accepted"
    # Заказчик уведомлён о смене статуса.
    assert Notification.objects.filter(recipient=customer, kind="order_status").exists()


@pytest.mark.django_db
def test_invalid_status_transition_rejected(api, setup):
    customer, owner, workshop = setup
    order = Order.objects.create(customer=customer, workshop=workshop, description="z")
    api.force_authenticate(user=owner)
    # request → done напрямую запрещён (только request→accepted/cancelled)
    resp = api.patch(f"{INCOMING}{order.id}/", {"status": "done"})
    assert resp.status_code == 400
    order.refresh_from_db()
    assert order.status == "request"


@pytest.mark.django_db
def test_non_owner_cannot_change_status(api, setup, make_user):
    customer, owner, workshop = setup
    order = Order.objects.create(customer=customer, workshop=workshop, description="z")
    stranger = make_user(username="stranger", email="stranger@example.com")
    api.force_authenticate(user=stranger)
    assert api.patch(f"{INCOMING}{order.id}/", {"status": "accepted"}).status_code == 404


# ── Отзывы ──────────────────────────────────────────────────────────────────────

def _review_url(order_id):
    return f"{ORDERS}{order_id}/review/"


@pytest.mark.django_db
def test_review_after_done_updates_rating_and_notifies(api, setup):
    customer, owner, workshop = setup
    order = Order.objects.create(customer=customer, workshop=workshop,
                                 description="z", status="done")
    api.force_authenticate(user=customer)
    resp = api.post(_review_url(order.id), {"rating": 4, "text": "Отличный шлем"}, format="json")
    assert resp.status_code == 201

    workshop.refresh_from_db()
    assert float(workshop.rating) == 4.0       # пересчёт среднего
    assert Notification.objects.filter(recipient=owner, kind="review_new").exists()
    # Публичный список отзывов мастерской доступен анонимно
    api.force_authenticate(user=None)
    pub = api.get(f"/api/v1/workshops/{workshop.id}/reviews/")
    assert pub.status_code == 200
    assert len(pub.data) == 1 and pub.data[0]["rating"] == 4


@pytest.mark.django_db
def test_review_rejected_until_done(api, setup):
    customer, owner, workshop = setup
    order = Order.objects.create(customer=customer, workshop=workshop, description="z")
    api.force_authenticate(user=customer)
    assert api.post(_review_url(order.id), {"rating": 5}, format="json").status_code == 400


@pytest.mark.django_db
def test_review_only_once(api, setup):
    customer, owner, workshop = setup
    order = Order.objects.create(customer=customer, workshop=workshop,
                                 description="z", status="done")
    api.force_authenticate(user=customer)
    assert api.post(_review_url(order.id), {"rating": 5}, format="json").status_code == 201
    assert api.post(_review_url(order.id), {"rating": 1}, format="json").status_code == 400


@pytest.mark.django_db
def test_cannot_review_foreign_order(api, setup, make_user):
    customer, owner, workshop = setup
    order = Order.objects.create(customer=customer, workshop=workshop,
                                 description="z", status="done")
    stranger = make_user(username="rev_stranger", email="rev_stranger@example.com")
    api.force_authenticate(user=stranger)
    assert api.post(_review_url(order.id), {"rating": 5}, format="json").status_code == 404


@pytest.mark.django_db
def test_review_rating_bounds(api, setup):
    customer, owner, workshop = setup
    order = Order.objects.create(customer=customer, workshop=workshop,
                                 description="z", status="done")
    api.force_authenticate(user=customer)
    assert api.post(_review_url(order.id), {"rating": 6}, format="json").status_code == 400
    assert api.post(_review_url(order.id), {"rating": 0}, format="json").status_code == 400
