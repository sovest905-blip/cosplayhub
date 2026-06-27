"""Тесты Pro-кастомизации: свой URL (slug), скрытие из каталога, закреплённые образы."""
import pytest

from apps.billing.models import Subscription
from apps.looks.models import Look
from apps.profiles.models import Profile

ME = "/api/v1/auth/me/"
PROFILES = "/api/v1/profiles/"


def _pro(user):
    Subscription.objects.create(user=user, plan="pro", source="manual")  # бессрочный = активен


def _profile(user):
    return Profile.objects.create(user=user, display_name=user.username, roles=["cosplayer"])


@pytest.mark.django_db
def test_slug_ignored_for_non_pro(api, make_user):
    user = make_user()
    _profile(user)
    api.force_authenticate(user=user)
    resp = api.patch(ME, {"slug": "mynick"}, format="json")
    assert resp.status_code == 200
    user.profile.refresh_from_db()
    assert user.profile.slug is None  # не-Pro не может задать


@pytest.mark.django_db
def test_slug_set_for_pro(api, make_user):
    user = make_user()
    _profile(user)
    _pro(user)
    api.force_authenticate(user=user)
    resp = api.patch(ME, {"slug": "My Nick"}, format="json")
    assert resp.status_code == 200
    user.profile.refresh_from_db()
    assert user.profile.slug == "my-nick"  # slugify


@pytest.mark.django_db
def test_slug_unique(api, make_user):
    a = make_user(username="a", email="a@e.com"); _profile(a); _pro(a)
    b = make_user(username="b", email="b@e.com"); _profile(b); _pro(b)
    api.force_authenticate(user=a); api.patch(ME, {"slug": "star"}, format="json")
    api.force_authenticate(user=b)
    resp = api.patch(ME, {"slug": "star"}, format="json")
    assert resp.status_code == 400


@pytest.mark.django_db
def test_by_slug_resolves(api, make_user):
    user = make_user(); prof = _profile(user); _pro(user)
    api.force_authenticate(user=user); api.patch(ME, {"slug": "hero"}, format="json")
    api.force_authenticate(user=None)
    resp = api.get("/api/v1/profiles/by-slug/hero/")
    assert resp.status_code == 200
    assert resp.data["profile_id"] == prof.id


@pytest.mark.django_db
def test_hidden_excluded_from_catalog_but_direct_ok(api, make_user):
    user = make_user(); prof = _profile(user); _pro(user)
    api.force_authenticate(user=user); api.patch(ME, {"hide_from_catalog": True}, format="json")
    api.force_authenticate(user=None)
    # каталог не содержит
    data = api.get(PROFILES).data
    results = data["results"] if isinstance(data, dict) else data
    assert prof.id not in [p["id"] for p in results]
    # прямая ссылка работает
    assert api.get(f"{PROFILES}{prof.id}/").status_code == 200


@pytest.mark.django_db
def test_pinned_looks_in_serializer(api, make_user):
    user = make_user(); _profile(user); _pro(user)
    look = Look.objects.create(author=user, title="Закреп", is_published=True)
    api.force_authenticate(user=user)
    api.patch(ME, {"pinned_look_ids": [look.id]}, format="json")
    resp = api.get(f"{PROFILES}{user.profile.id}/")
    assert [p["id"] for p in resp.data["pinned_looks"]] == [look.id]


@pytest.mark.django_db
def test_media_kit_gated_for_non_pro(api, make_user):
    user = make_user(); _profile(user)
    api.force_authenticate(user=user)
    resp = api.get("/api/v1/profiles/me/media-kit/")
    assert resp.status_code == 200
    assert resp.data == {"pro": False}


@pytest.mark.django_db
def test_media_kit_pdf_for_pro(api, make_user):
    user = make_user(); _profile(user); _pro(user)
    api.force_authenticate(user=user)
    resp = api.get("/api/v1/profiles/me/media-kit/")
    assert resp.status_code == 200
    assert resp["Content-Type"] == "application/pdf"
    assert resp.content[:4] == b"%PDF"


@pytest.mark.django_db
def test_pinned_capped_at_three(api, make_user):
    user = make_user(); _profile(user); _pro(user)
    ids = [Look.objects.create(author=user, title=f"L{i}").id for i in range(5)]
    api.force_authenticate(user=user)
    api.patch(ME, {"pinned_look_ids": ids}, format="json")
    user.profile.refresh_from_db()
    assert len(user.profile.pinned_look_ids) == 3
