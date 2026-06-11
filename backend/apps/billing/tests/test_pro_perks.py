"""Тесты Pro-льгот (группа A): галочка от Pro, приоритет в каталоге, аналитика-гейт."""
import pytest

from apps.billing.models import Subscription
from apps.profiles.models import Profile

PROFILES = "/api/v1/profiles/"
WORKSHOPS = "/api/v1/workshops/"
ANALYTICS = "/api/v1/analytics/me/"


def _pro(user):
    return Subscription.objects.create(user=user, plan="pro", source="manual")  # бессрочная = активна


@pytest.mark.django_db
def test_pro_gives_blue_check(api, make_user):
    """Активный Pro → is_verified=true, даже если ручная галочка не выдана."""
    user = make_user(username="prouser")
    Profile.objects.create(user=user, display_name="Pro User", roles=["cosplayer"])
    assert user.is_verified is False
    _pro(user)
    resp = api.get(f"{PROFILES}{user.id}/")
    assert resp.status_code == 200
    assert resp.data["is_verified"] is True


@pytest.mark.django_db
def test_non_pro_no_check_without_manual(api, make_user):
    user = make_user(username="plain")
    Profile.objects.create(user=user, display_name="Plain", roles=["cosplayer"])
    resp = api.get(f"{PROFILES}{user.id}/")
    assert resp.data["is_verified"] is False


@pytest.mark.django_db
def test_pro_profile_ranks_first_in_catalog(api, make_user):
    """Pro-профиль выше не-Pro в каталоге, даже если создан раньше."""
    old_pro = make_user(username="oldpro")
    Profile.objects.create(user=old_pro, display_name="Old Pro", roles=["cosplayer"])
    new_plain = make_user(username="newplain")
    Profile.objects.create(user=new_plain, display_name="New Plain", roles=["cosplayer"])
    _pro(old_pro)  # старый, но Pro

    resp = api.get(PROFILES)
    results = resp.data["results"] if isinstance(resp.data, dict) else resp.data
    names = [p["display_name"] for p in results]
    assert names.index("Old Pro") < names.index("New Plain")


@pytest.mark.django_db
def test_pro_workshop_ranks_first(api, make_user, make_workshop):
    plain = make_workshop(owner=make_user(username="w1"), name="Plain WS")
    prouser = make_user(username="w2")
    prows = make_workshop(owner=prouser, name="Pro WS")
    Subscription.objects.create(user=prouser, plan="workshop", workshop=prows, source="manual")

    resp = api.get(WORKSHOPS)
    results = resp.data["results"] if isinstance(resp.data, dict) else resp.data
    names = [w["name"] for w in results]
    assert names.index("Pro WS") < names.index("Plain WS")


@pytest.mark.django_db
def test_analytics_gated_for_non_pro(api, make_user):
    user = make_user()
    api.force_authenticate(user=user)
    resp = api.get(ANALYTICS)
    assert resp.status_code == 200
    assert resp.data == {"pro": False}


@pytest.mark.django_db
def test_analytics_for_pro(api, make_user):
    user = make_user()
    Profile.objects.create(user=user, display_name="P", roles=["cosplayer"])
    _pro(user)
    api.force_authenticate(user=user)
    resp = api.get(ANALYTICS)
    assert resp.status_code == 200
    assert resp.data["pro"] is True
    assert "followers" in resp.data["profile"]
    assert resp.data["business"] is None   # нет мастерских


@pytest.mark.django_db
def test_analytics_requires_auth(api):
    assert api.get(ANALYTICS).status_code == 403
