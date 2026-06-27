"""Тесты Pro-льготы «кто смотрел»: трекинг просмотров, дедуп, гейт эндпоинта."""
import pytest

from apps.billing.models import Subscription
from apps.profiles.models import Profile, ProfileView

VIEWERS = "/api/v1/profiles/me/viewers/"


def _profile(user, name="P"):
    return Profile.objects.create(user=user, display_name=name, roles=["cosplayer"])


def _ping(profile_id):
    return f"/api/v1/profiles/{profile_id}/view/"


@pytest.mark.django_db
def test_view_tracked_for_authenticated_visitor(api, make_user):
    owner = make_user(username="owner", email="owner@e.com")
    prof = _profile(owner, "Owner")
    visitor = make_user(username="visitor", email="vis@e.com")

    api.force_authenticate(user=visitor)
    assert api.post(_ping(prof.id)).status_code == 204
    assert ProfileView.objects.filter(profile=prof, viewer=visitor).count() == 1


@pytest.mark.django_db
def test_view_not_tracked_for_self(api, make_user):
    owner = make_user()
    prof = _profile(owner, "Self")
    api.force_authenticate(user=owner)
    api.post(_ping(prof.id))
    assert ProfileView.objects.filter(profile=prof).count() == 0


@pytest.mark.django_db
def test_view_requires_auth(api, make_user):
    owner = make_user()
    prof = _profile(owner, "Anon")
    assert api.post(_ping(prof.id)).status_code == 403
    assert ProfileView.objects.filter(profile=prof).count() == 0


@pytest.mark.django_db
def test_view_dedup_per_day(api, make_user):
    owner = make_user(username="o", email="o@e.com")
    prof = _profile(owner, "Dedup")
    visitor = make_user(username="v", email="v@e.com")
    api.force_authenticate(user=visitor)
    api.post(_ping(prof.id))
    api.post(_ping(prof.id))
    assert ProfileView.objects.filter(profile=prof, viewer=visitor).count() == 1


@pytest.mark.django_db
def test_viewers_gated_for_non_pro(api, make_user):
    user = make_user()
    _profile(user)
    api.force_authenticate(user=user)
    resp = api.get(VIEWERS)
    assert resp.status_code == 200
    assert resp.data == {"pro": False}


@pytest.mark.django_db
def test_viewers_listed_for_pro(api, make_user):
    owner = make_user(username="pro", email="pro@e.com")
    prof = _profile(owner, "ProOwner")
    Subscription.objects.create(user=owner, plan="pro", source="manual")  # бессрочный Pro
    visitor = make_user(username="guest", email="guest@e.com")
    _profile(visitor, "Guest")

    api.force_authenticate(user=visitor)
    api.post(_ping(prof.id))

    api.force_authenticate(user=owner)
    resp = api.get(VIEWERS)
    assert resp.status_code == 200
    assert resp.data["pro"] is True
    assert resp.data["total_30d"] == 1
    assert resp.data["unique_30d"] == 1
    assert resp.data["viewers"][0]["display_name"] == "Guest"


@pytest.mark.django_db
def test_viewers_requires_auth(api):
    assert api.get(VIEWERS).status_code == 403
