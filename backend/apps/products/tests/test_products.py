"""Тесты товаров магазина: создание (владелец+активен), витрина, mine/owner, правка владелец/staff."""
import pytest

from apps.products.models import Product

PRODUCTS = "/api/v1/products/"


def p_url(pid):
    return f"/api/v1/products/{pid}/"


def _results(data):
    return data["results"] if isinstance(data, dict) else data


@pytest.mark.django_db
def test_create_requires_auth(api):
    assert api.post(PRODUCTS, {"title": "Парик"}).status_code == 403


@pytest.mark.django_db
def test_create_sets_owner_and_active(api, make_user):
    user = make_user()
    api.force_authenticate(user=user)
    resp = api.post(PRODUCTS, {"title": "Парик", "price": 5000}, format="json")
    assert resp.status_code == 201
    p = Product.objects.get()
    assert p.owner == user and p.is_active is True


@pytest.mark.django_db
def test_anon_sees_only_active(api, make_user):
    owner = make_user()
    Product.objects.create(owner=owner, title="виден", is_active=True)
    Product.objects.create(owner=owner, title="скрыт", is_active=False)
    resp = api.get(PRODUCTS)
    assert resp.status_code == 200
    titles = [p["title"] for p in _results(resp.data)]
    assert "виден" in titles and "скрыт" not in titles


@pytest.mark.django_db
def test_owner_filter_returns_active_of_seller(api, make_user):
    seller = make_user(username="s", email="s@example.com")
    Product.objects.create(owner=seller, title="на витрине", is_active=True)
    Product.objects.create(owner=seller, title="снят", is_active=False)
    resp = api.get(PRODUCTS, {"owner": seller.id})
    titles = [p["title"] for p in _results(resp.data)]
    assert titles == ["на витрине"]


@pytest.mark.django_db
def test_mine_returns_own_including_inactive(api, make_user):
    me = make_user(username="me", email="me@example.com")
    other = make_user(username="o", email="o@example.com")
    Product.objects.create(owner=me, title="моё", is_active=False)
    Product.objects.create(owner=other, title="чужое", is_active=True)
    api.force_authenticate(user=me)
    resp = api.get(PRODUCTS, {"mine": "1"})
    assert [p["title"] for p in _results(resp.data)] == ["моё"]


@pytest.mark.django_db
def test_non_owner_cannot_edit(api, make_user):
    owner = make_user(username="o", email="o@example.com")
    other = make_user(username="x", email="x@example.com")
    p = Product.objects.create(owner=owner, title="чужое")
    api.force_authenticate(user=other)
    assert api.patch(p_url(p.id), {"title": "взлом"}, format="json").status_code == 403


@pytest.mark.django_db
def test_staff_can_delete_any(api, make_user):
    owner = make_user(username="o", email="o@example.com")
    staff = make_user(username="mod", email="mod@example.com", is_staff=True)
    p = Product.objects.create(owner=owner, title="x")
    api.force_authenticate(user=staff)
    assert api.delete(p_url(p.id)).status_code == 204
