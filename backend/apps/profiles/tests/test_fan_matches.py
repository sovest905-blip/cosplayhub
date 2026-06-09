"""Тесты матчинга фанатов: пересечение фандомов/хобби, ранжирование, follow-статус."""
import pytest

from apps.profiles.models import Follow, Profile

MATCHES = "/api/v1/profiles/fan-matches/"


def _fan(user, fandoms="", hobbies=None, roles=None):
    return Profile.objects.create(
        user=user, display_name=user.username, roles=roles or ["fan"],
        role_details={"fan": {"fandoms": fandoms, "hobbies": hobbies or []}},
    )


@pytest.mark.django_db
def test_requires_auth(api):
    assert api.get(MATCHES).status_code == 403


@pytest.mark.django_db
def test_empty_profile_not_ready(api, make_user):
    me = make_user()
    _fan(me, fandoms="", hobbies=[])
    api.force_authenticate(user=me)
    resp = api.get(MATCHES)
    assert resp.status_code == 200
    assert resp.data["ready"] is False
    assert resp.data["matches"] == []


@pytest.mark.django_db
def test_matches_by_shared_fandoms_and_hobbies(api, make_user):
    me = make_user(username="me")
    _fan(me, fandoms="Genshin, Naruto", hobbies=["Аниме", "Игры"])
    other = make_user(username="other")
    _fan(other, fandoms="genshin, Marvel", hobbies=["Игры"])
    api.force_authenticate(user=me)

    resp = api.get(MATCHES)
    assert resp.data["ready"] is True
    assert len(resp.data["matches"]) == 1
    m = resp.data["matches"][0]
    assert m["display_name"] == "other"
    assert m["shared_fandoms"] == ["genshin"]   # регистронезависимо
    assert m["shared_hobbies"] == ["игры"]
    assert m["score"] == 2
    assert m["is_following"] is False


@pytest.mark.django_db
def test_ranked_by_overlap_count(api, make_user):
    me = make_user(username="me")
    _fan(me, fandoms="A, B, C", hobbies=["Аниме"])
    weak = make_user(username="weak")
    _fan(weak, fandoms="A", hobbies=[])
    strong = make_user(username="strong")
    _fan(strong, fandoms="A, B, C", hobbies=["Аниме"])
    api.force_authenticate(user=me)

    names = [m["display_name"] for m in api.get(MATCHES).data["matches"]]
    assert names == ["strong", "weak"]  # больше совпадений — выше


@pytest.mark.django_db
def test_no_overlap_excluded(api, make_user):
    me = make_user(username="me")
    _fan(me, fandoms="Genshin", hobbies=["Аниме"])
    stranger = make_user(username="stranger")
    _fan(stranger, fandoms="Touhou", hobbies=["Музыка"])
    api.force_authenticate(user=me)
    assert api.get(MATCHES).data["matches"] == []


@pytest.mark.django_db
def test_self_excluded(api, make_user):
    me = make_user(username="me")
    _fan(me, fandoms="Genshin", hobbies=["Игры"])
    api.force_authenticate(user=me)
    assert api.get(MATCHES).data["matches"] == []


@pytest.mark.django_db
def test_following_flag(api, make_user):
    me = make_user(username="me")
    _fan(me, fandoms="Genshin", hobbies=[])
    other = make_user(username="other")
    _fan(other, fandoms="Genshin", hobbies=[])
    Follow.objects.create(follower=me, target=other)
    api.force_authenticate(user=me)
    assert api.get(MATCHES).data["matches"][0]["is_following"] is True


@pytest.mark.django_db
def test_non_fan_profiles_ignored(api, make_user):
    me = make_user(username="me")
    _fan(me, fandoms="Genshin", hobbies=[])
    # косплеер с совпадающим фандомом, но без роли fan → не кандидат
    cos = make_user(username="cos")
    _fan(cos, fandoms="Genshin", hobbies=[], roles=["cosplayer"])
    api.force_authenticate(user=me)
    assert api.get(MATCHES).data["matches"] == []
