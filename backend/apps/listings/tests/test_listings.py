"""Тесты объявлений: приватный CRUD (только свои) + публичная витрина (активные)."""
import pytest

from apps.listings.models import Listing

LISTINGS = "/api/v1/listings/"
PUBLIC = "/api/v1/listings/public/"


def _results(data):
    return data["results"] if isinstance(data, dict) else data


# ── Приватный CRUD ───────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_create_requires_auth(api):
    assert api.post(LISTINGS, {"title": "Продам шлем", "type": "sell"}).status_code == 403


@pytest.mark.django_db
def test_create_sets_user(api, make_user):
    user = make_user()
    api.force_authenticate(user=user)
    resp = api.post(LISTINGS, {"title": "Продам шлем", "type": "sell"}, format="json")
    assert resp.status_code == 201
    assert Listing.objects.get().user == user


@pytest.mark.django_db
def test_list_shows_only_own(api, make_user):
    me = make_user(username="me", email="me@example.com")
    other = make_user(username="other", email="other@example.com")
    Listing.objects.create(user=me, title="моё", type="sell")
    Listing.objects.create(user=other, title="чужое", type="sell")
    api.force_authenticate(user=me)
    resp = api.get(LISTINGS)
    assert resp.status_code == 200
    results = _results(resp.data)
    assert len(results) == 1
    assert results[0]["title"] == "моё"


@pytest.mark.django_db
def test_cannot_edit_foreign_listing(api, make_user):
    owner = make_user(username="o", email="o@example.com")
    other = make_user(username="x", email="x@example.com")
    lst = Listing.objects.create(user=owner, title="чужое", type="sell")
    api.force_authenticate(user=other)
    # Чужое не попадает в queryset владельца → 404 (не видно вообще).
    assert api.patch(f"{LISTINGS}{lst.id}/", {"title": "взлом"}, format="json").status_code == 404
    lst.refresh_from_db()
    assert lst.title == "чужое"


@pytest.mark.django_db
def test_owner_can_delete(api, make_user):
    user = make_user()
    lst = Listing.objects.create(user=user, title="убрать", type="buy")
    api.force_authenticate(user=user)
    assert api.delete(f"{LISTINGS}{lst.id}/").status_code == 204
    assert not Listing.objects.filter(id=lst.id).exists()


# ── Публичная витрина ────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_public_shows_only_active(api, make_user):
    user = make_user()
    Listing.objects.create(user=user, title="видно", type="sell", is_active=True)
    Listing.objects.create(user=user, title="скрыто", type="sell", is_active=False)
    resp = api.get(PUBLIC)  # без аутентификации
    assert resp.status_code == 200
    titles = [x["title"] for x in resp.data]
    assert "видно" in titles
    assert "скрыто" not in titles


@pytest.mark.django_db
def test_public_filter_by_type(api, make_user):
    user = make_user()
    Listing.objects.create(user=user, title="продажа", type="sell")
    Listing.objects.create(user=user, title="вакансия", type="job")
    resp = api.get(PUBLIC, {"types": "sell"})
    titles = [x["title"] for x in resp.data]
    assert titles == ["продажа"]


@pytest.mark.django_db
def test_public_is_anonymous(api, make_user):
    Listing.objects.create(user=make_user(), title="x", type="collab")
    # Эндпоинт без авторизации обязан отвечать 200 (AllowAny).
    assert api.get(PUBLIC).status_code == 200
