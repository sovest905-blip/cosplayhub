"""Тесты мастерских: публичное чтение, создание с владельцем, правка/удаление только своих."""
import pytest

from apps.workshops.models import Workshop

WS = "/api/v1/workshops/"
MINE = "/api/v1/workshops/mine/"


def _results(data):
    return data["results"] if isinstance(data, dict) else data


# ── Чтение (публичное) ───────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_anon_can_list(api, make_user, make_workshop):
    make_workshop(owner=make_user())
    resp = api.get(WS)
    assert resp.status_code == 200
    assert len(_results(resp.data)) == 1


@pytest.mark.django_db
def test_anon_can_retrieve(api, make_user, make_workshop):
    ws = make_workshop(owner=make_user())
    assert api.get(f"{WS}{ws.id}/").status_code == 200


# ── Создание ─────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_create_requires_auth(api):
    assert api.post(WS, {"name": "X", "type": "eva", "city": "Алматы"}).status_code == 403


@pytest.mark.django_db
def test_create_sets_owner(api, make_user):
    user = make_user()
    api.force_authenticate(user=user)
    resp = api.post(WS, {"name": "ЭВА-цех", "type": "eva", "city": "Алматы"}, format="json")
    assert resp.status_code == 201
    assert Workshop.objects.get().owner == user


@pytest.mark.django_db
def test_create_with_services(api, make_user):
    user = make_user()
    api.force_authenticate(user=user)
    payload = {
        "name": "Парики", "type": "wigs", "city": "Астана",
        "services": [{"name": "Стрижка", "price_from": 5000}],
    }
    resp = api.post(WS, payload, format="json")
    assert resp.status_code == 201
    assert Workshop.objects.get().services.count() == 1


# ── Правка/удаление — только владелец ────────────────────────────────────────────

@pytest.mark.django_db
def test_owner_can_update(api, make_user, make_workshop):
    owner = make_user()
    ws = make_workshop(owner=owner, name="старое")
    api.force_authenticate(user=owner)
    resp = api.patch(f"{WS}{ws.id}/", {"name": "новое"}, format="json")
    assert resp.status_code == 200
    ws.refresh_from_db()
    assert ws.name == "новое"


@pytest.mark.django_db
def test_non_owner_cannot_update(api, make_user, make_workshop):
    owner = make_user(username="o", email="o@example.com")
    other = make_user(username="x", email="x@example.com")
    ws = make_workshop(owner=owner, name="чужое")
    api.force_authenticate(user=other)
    resp = api.patch(f"{WS}{ws.id}/", {"name": "взлом"}, format="json")
    assert resp.status_code == 403
    ws.refresh_from_db()
    assert ws.name == "чужое"


@pytest.mark.django_db
def test_non_owner_cannot_delete(api, make_user, make_workshop):
    owner = make_user(username="o2", email="o2@example.com")
    other = make_user(username="x2", email="x2@example.com")
    ws = make_workshop(owner=owner)
    api.force_authenticate(user=other)
    assert api.delete(f"{WS}{ws.id}/").status_code == 403
    assert Workshop.objects.filter(id=ws.id).exists()


# ── mine ─────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_mine_returns_only_own(api, make_user, make_workshop):
    me = make_user(username="me", email="me@example.com")
    other = make_user(username="not", email="not@example.com")
    make_workshop(owner=me, name="моя")
    make_workshop(owner=other, name="чужая")
    api.force_authenticate(user=me)
    resp = api.get(MINE)
    assert resp.status_code == 200
    assert len(_results(resp.data)) == 1
    assert _results(resp.data)[0]["name"] == "моя"


# ── Фото работ ───────────────────────────────────────────────────────────────────

GIF = (b"GIF89a\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00\xff\xff\xff!\xf9\x04"
       b"\x00\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;")


def _img(name="work.gif"):
    from django.core.files.uploadedfile import SimpleUploadedFile
    return SimpleUploadedFile(name, GIF, content_type="image/gif")


@pytest.mark.django_db
def test_owner_uploads_photo_and_it_appears_in_detail(api, make_user, make_workshop):
    owner = make_user(username="ph1", email="ph1@example.com")
    ws = make_workshop(owner=owner)
    api.force_authenticate(user=owner)
    resp = api.post(f"{WS}{ws.id}/photos/", {"image": _img()}, format="multipart")
    assert resp.status_code == 201
    detail = api.get(f"{WS}{ws.id}/")
    assert len(detail.data["photos"]) == 1


@pytest.mark.django_db
def test_photo_limit_is_five(api, make_user, make_workshop):
    owner = make_user(username="ph2", email="ph2@example.com")
    ws = make_workshop(owner=owner)
    api.force_authenticate(user=owner)
    for i in range(5):
        assert api.post(f"{WS}{ws.id}/photos/", {"image": _img(f"w{i}.gif")}, format="multipart").status_code == 201
    assert api.post(f"{WS}{ws.id}/photos/", {"image": _img("w6.gif")}, format="multipart").status_code == 400


@pytest.mark.django_db
def test_non_owner_cannot_upload_or_delete_photo(api, make_user, make_workshop):
    owner = make_user(username="ph3", email="ph3@example.com")
    other = make_user(username="ph4", email="ph4@example.com")
    ws = make_workshop(owner=owner)
    api.force_authenticate(user=owner)
    photo_id = api.post(f"{WS}{ws.id}/photos/", {"image": _img()}, format="multipart").data["id"]

    api.force_authenticate(user=other)
    assert api.post(f"{WS}{ws.id}/photos/", {"image": _img()}, format="multipart").status_code == 403
    assert api.delete(f"{WS}{ws.id}/photos/{photo_id}/").status_code == 403

    api.force_authenticate(user=owner)
    assert api.delete(f"{WS}{ws.id}/photos/{photo_id}/").status_code == 204
