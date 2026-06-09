"""Тесты образов: создание (автор/публикация), лента, лайки, модерация (автор/staff)."""
import pytest

from apps.looks.models import Look, LookLike

LOOKS = "/api/v1/looks/"


def look_url(lid, suffix=""):
    return f"/api/v1/looks/{lid}/{suffix}"


def _results(data):
    return data["results"] if isinstance(data, dict) else data


# ── Создание ─────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_create_requires_auth(api):
    assert api.post(LOOKS, {"title": "Гэндальф"}).status_code == 403


@pytest.mark.django_db
def test_create_sets_author_and_publishes(api, make_user):
    user = make_user()
    api.force_authenticate(user=user)
    resp = api.post(LOOKS, {"title": "Гэндальф"}, format="json")
    assert resp.status_code == 201
    look = Look.objects.get()
    assert look.author == user
    assert look.is_published is True


# ── Лента / видимость ────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_anon_sees_published(api, make_user):
    Look.objects.create(author=make_user(), title="видно", is_published=True)
    resp = api.get(LOOKS)
    assert resp.status_code == 200
    assert len(_results(resp.data)) == 1


@pytest.mark.django_db
def test_anon_does_not_see_unpublished(api, make_user):
    Look.objects.create(author=make_user(), title="скрыт", is_published=False)
    resp = api.get(LOOKS)
    assert len(_results(resp.data)) == 0


@pytest.mark.django_db
def test_mine_filter_returns_own(api, make_user):
    me = make_user(username="me", email="me@example.com")
    other = make_user(username="o", email="o@example.com")
    Look.objects.create(author=me, title="моё")
    Look.objects.create(author=other, title="чужое")
    api.force_authenticate(user=me)
    resp = api.get(LOOKS, {"mine": "1"})
    assert [l["title"] for l in _results(resp.data)] == ["моё"]


# ── Лайки ────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_like_toggle(api, make_user):
    author = make_user(username="a", email="a@example.com")
    fan = make_user(username="f", email="f@example.com")
    look = Look.objects.create(author=author, title="x")
    api.force_authenticate(user=fan)
    on = api.post(look_url(look.id, "like/"))
    assert on.data == {"likes_count": 1, "is_liked": True}
    off = api.delete(look_url(look.id, "like/"))
    assert off.data == {"likes_count": 0, "is_liked": False}
    assert not LookLike.objects.filter(look=look).exists()


@pytest.mark.django_db
def test_like_requires_auth(api, make_user):
    look = Look.objects.create(author=make_user(), title="x")
    assert api.post(look_url(look.id, "like/")).status_code == 403


# ── Модерация (автор / staff) ────────────────────────────────────────────────────

@pytest.mark.django_db
def test_author_can_delete(api, make_user):
    author = make_user()
    look = Look.objects.create(author=author, title="x")
    api.force_authenticate(user=author)
    assert api.delete(look_url(look.id)).status_code == 204


@pytest.mark.django_db
def test_non_author_cannot_delete(api, make_user):
    author = make_user(username="a", email="a@example.com")
    other = make_user(username="o", email="o@example.com")
    look = Look.objects.create(author=author, title="x")
    api.force_authenticate(user=other)
    assert api.delete(look_url(look.id)).status_code == 403
    assert Look.objects.filter(id=look.id).exists()


@pytest.mark.django_db
def test_staff_can_delete_any(api, make_user):
    author = make_user(username="a", email="a@example.com")
    staff = make_user(username="mod", email="mod@example.com", is_staff=True)
    look = Look.objects.create(author=author, title="x")
    api.force_authenticate(user=staff)
    assert api.delete(look_url(look.id)).status_code == 204
