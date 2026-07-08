"""Тесты гайдов: пишут косплееры/мастерские (на модерацию), staff — сразу,
читают все опубликованное, правит автор/staff."""
import pytest

from apps.guides.models import Guide

GUIDES = "/api/v1/guides/"


def g_url(gid):
    return f"/api/v1/guides/{gid}/"


def _results(data):
    return data["results"] if isinstance(data, dict) else data


def _give_role(user, role):
    from apps.profiles.models import Profile
    Profile.objects.update_or_create(user=user, defaults={"display_name": user.username, "roles": [role]})


@pytest.mark.django_db
def test_create_requires_auth(api):
    assert api.post(GUIDES, {"title": "EVA для новичков"}).status_code == 403


@pytest.mark.django_db
def test_cosplayer_create_goes_to_moderation(api, make_user):
    user = make_user()
    _give_role(user, "cosplayer")
    api.force_authenticate(user=user)
    resp = api.post(GUIDES, {"title": "EVA для новичков", "body": "текст"}, format="json")
    assert resp.status_code == 201
    g = Guide.objects.get()
    assert g.author == user
    assert g.status == "pending" and g.is_published is False


@pytest.mark.django_db
def test_user_without_role_cannot_create(api, make_user):
    user = make_user()  # без роли косплеера/мастерской
    api.force_authenticate(user=user)
    assert api.post(GUIDES, {"title": "нельзя"}, format="json").status_code == 403


@pytest.mark.django_db
def test_staff_create_is_published(api, make_user):
    staff = make_user(is_staff=True)
    api.force_authenticate(user=staff)
    resp = api.post(GUIDES, {"title": "от редакции"}, format="json")
    assert resp.status_code == 201
    g = Guide.objects.get()
    assert g.status == "published" and g.is_published is True


@pytest.mark.django_db
def test_anon_sees_published_only(api, make_user):
    author = make_user()
    Guide.objects.create(author=author, title="опубликован", is_published=True)
    Guide.objects.create(author=author, title="черновик", is_published=False)
    resp = api.get(GUIDES)
    titles = [g["title"] for g in _results(resp.data)]
    assert "опубликован" in titles and "черновик" not in titles


@pytest.mark.django_db
def test_author_can_edit(api, make_user):
    author = make_user()
    g = Guide.objects.create(author=author, title="старое")
    api.force_authenticate(user=author)
    resp = api.patch(g_url(g.id), {"title": "новое"}, format="json")
    assert resp.status_code == 200
    g.refresh_from_db()
    assert g.title == "новое"


@pytest.mark.django_db
def test_author_edit_published_returns_to_moderation(api, make_user):
    author = make_user()
    g = Guide.objects.create(author=author, title="одобрен", status="published", is_published=True)
    api.force_authenticate(user=author)
    api.patch(g_url(g.id), {"title": "поправил"}, format="json")
    g.refresh_from_db()
    assert g.status == "pending" and g.is_published is False


@pytest.mark.django_db
def test_author_cannot_self_publish_via_patch(api, make_user):
    author = make_user()
    g = Guide.objects.create(author=author, title="черновик", status="pending", is_published=False)
    api.force_authenticate(user=author)
    api.patch(g_url(g.id), {"is_published": True, "status": "published"}, format="json")
    g.refresh_from_db()
    assert g.is_published is False and g.status == "pending"


@pytest.mark.django_db
def test_staff_moderation_approve_reject(api, make_user):
    author = make_user()
    staff = make_user(username="mod", email="mod@example.com", is_staff=True)
    g = Guide.objects.create(author=author, title="на проверку", status="pending", is_published=False)
    api.force_authenticate(user=staff)
    base = f"/api/v1/admin-panel/guides/{g.id}/moderate/"
    # одобрить
    assert api.post(base, {"action": "approve"}, format="json").status_code == 200
    g.refresh_from_db()
    assert g.status == "published" and g.is_published is True
    # отклонить с причиной
    assert api.post(base, {"action": "reject", "note": "мало деталей"}, format="json").status_code == 200
    g.refresh_from_db()
    assert g.status == "rejected" and g.is_published is False and g.moderation_note == "мало деталей"


@pytest.mark.django_db
def test_non_author_cannot_edit(api, make_user):
    author = make_user(username="a", email="a@example.com")
    other = make_user(username="o", email="o@example.com")
    g = Guide.objects.create(author=author, title="чужой")
    api.force_authenticate(user=other)
    assert api.patch(g_url(g.id), {"title": "взлом"}, format="json").status_code == 403


@pytest.mark.django_db
def test_staff_can_delete_any(api, make_user):
    author = make_user(username="a", email="a@example.com")
    staff = make_user(username="mod", email="mod@example.com", is_staff=True)
    g = Guide.objects.create(author=author, title="x")
    api.force_authenticate(user=staff)
    assert api.delete(g_url(g.id)).status_code == 204


# ── Фото в гайде ─────────────────────────────────────────────────────────────────

GIF = (b"GIF89a\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00\xff\xff\xff!\xf9\x04"
       b"\x00\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;")


def _img(name="pic.gif"):
    from django.core.files.uploadedfile import SimpleUploadedFile
    return SimpleUploadedFile(name, GIF, content_type="image/gif")


@pytest.mark.django_db
def test_author_uploads_photo_limit_five(api, make_user):
    author = make_user(username="gph", email="gph@example.com")
    g = Guide.objects.create(author=author, title="с фото")
    api.force_authenticate(user=author)
    for i in range(5):
        assert api.post(f"{g_url(g.id)}photos/", {"image": _img(f"p{i}.gif")}, format="multipart").status_code == 201
    assert api.post(f"{g_url(g.id)}photos/", {"image": _img("p6.gif")}, format="multipart").status_code == 400
    # Фото отдаются в детали гайда
    assert len(api.get(g_url(g.id)).data["photos"]) == 5


@pytest.mark.django_db
def test_non_author_cannot_manage_photos(api, make_user):
    author = make_user(username="gph2", email="gph2@example.com")
    other = make_user(username="gph3", email="gph3@example.com")
    g = Guide.objects.create(author=author, title="чужие фото")
    api.force_authenticate(user=author)
    photo_id = api.post(f"{g_url(g.id)}photos/", {"image": _img()}, format="multipart").data["id"]

    api.force_authenticate(user=other)
    assert api.post(f"{g_url(g.id)}photos/", {"image": _img()}, format="multipart").status_code == 403
    assert api.delete(f"{g_url(g.id)}photos/{photo_id}/").status_code == 403
