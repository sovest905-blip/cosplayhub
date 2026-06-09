"""Тесты подписок (Follow) и избранного (Favorite)."""
import pytest

from apps.notifications.models import Notification
from apps.profiles.models import Favorite, Follow, Profile
from apps.workshops.models import Workshop


def _profile(user, **kw):
    kw.setdefault("display_name", user.username)
    kw.setdefault("roles", ["fan"])
    return Profile.objects.create(user=user, **kw)


def follow_url(uid):
    return f"/api/v1/follow/{uid}/"


FOLLOWING = "/api/v1/follow/following/"
FOLLOWERS = "/api/v1/follow/followers/"
FAVS = "/api/v1/favorites/"


def fav_url(kind, oid):
    return f"/api/v1/favorites/{kind}/{oid}/"


# ── Подписки ─────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_follow_creates_counts_and_notifies(api, make_user):
    alice = make_user(username="alice", email="a@example.com")
    bob = make_user(username="bob", email="b@example.com")
    api.force_authenticate(user=alice)
    resp = api.post(follow_url(bob.id))
    assert resp.status_code == 201
    assert resp.data["following"] is True
    assert resp.data["followers_count"] == 1
    assert Follow.objects.filter(follower=alice, target=bob).exists()
    assert Notification.objects.filter(recipient=bob).exists()


@pytest.mark.django_db
def test_follow_self_rejected(api, make_user):
    alice = make_user()
    api.force_authenticate(user=alice)
    assert api.post(follow_url(alice.id)).status_code == 400


@pytest.mark.django_db
def test_follow_is_idempotent(api, make_user):
    alice = make_user(username="a", email="a@example.com")
    bob = make_user(username="b", email="b@example.com")
    api.force_authenticate(user=alice)
    assert api.post(follow_url(bob.id)).status_code == 201
    assert api.post(follow_url(bob.id)).status_code == 200  # уже подписан
    assert Follow.objects.filter(follower=alice, target=bob).count() == 1


@pytest.mark.django_db
def test_unfollow(api, make_user):
    alice = make_user(username="a", email="a@example.com")
    bob = make_user(username="b", email="b@example.com")
    Follow.objects.create(follower=alice, target=bob)
    api.force_authenticate(user=alice)
    resp = api.delete(follow_url(bob.id))
    assert resp.data["following"] is False
    assert not Follow.objects.filter(follower=alice, target=bob).exists()


@pytest.mark.django_db
def test_follow_requires_auth(api, make_user):
    bob = make_user()
    assert api.post(follow_url(bob.id)).status_code == 403


@pytest.mark.django_db
def test_following_and_followers_lists(api, make_user):
    alice = make_user(username="alice", email="a@example.com")
    bob = make_user(username="bob", email="b@example.com")
    _profile(alice)
    _profile(bob)
    Follow.objects.create(follower=alice, target=bob)

    api.force_authenticate(user=alice)
    following = api.get(FOLLOWING)
    assert [p["display_name"] for p in following.data] == ["bob"]

    api.force_authenticate(user=bob)
    followers = api.get(FOLLOWERS)
    assert [p["display_name"] for p in followers.data] == ["alice"]


# ── Избранное (ГРАБЛЯ: object_id профиля = profile.id, не user_id) ────────────────

@pytest.mark.django_db
def test_favorite_profile_toggle(api, make_user):
    alice = make_user(username="a", email="a@example.com")
    target = make_user(username="t", email="t@example.com")
    prof = _profile(target)
    api.force_authenticate(user=alice)

    assert api.post(fav_url("profile", prof.id)).status_code == 201
    assert api.get(fav_url("profile", prof.id)).data["favorited"] is True
    assert Favorite.objects.filter(user=alice, kind="profile", object_id=prof.id).exists()

    assert api.delete(fav_url("profile", prof.id)).data["favorited"] is False
    assert not Favorite.objects.filter(user=alice, kind="profile", object_id=prof.id).exists()


@pytest.mark.django_db
def test_favorite_invalid_kind_rejected(api, make_user):
    alice = make_user()
    api.force_authenticate(user=alice)
    assert api.post(fav_url("banana", 1)).status_code == 400


@pytest.mark.django_db
def test_favorite_list_resolves_profile_and_workshop(api, make_user):
    alice = make_user(username="a", email="a@example.com")
    other = make_user(username="o", email="o@example.com")
    prof = _profile(other)
    ws = Workshop.objects.create(owner=other, name="Цех", type="eva", city="Алматы")

    Favorite.objects.create(user=alice, kind="profile", object_id=prof.id)
    Favorite.objects.create(user=alice, kind="workshop", object_id=ws.id)

    api.force_authenticate(user=alice)
    resp = api.get(FAVS)
    assert resp.status_code == 200
    kinds = sorted(item["kind"] for item in resp.data)
    assert kinds == ["profile", "workshop"]


@pytest.mark.django_db
def test_favorites_requires_auth(api):
    assert api.get(FAVS).status_code == 403
