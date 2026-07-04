"""Тесты публичной статистики и умного поиска (оба AllowAny)."""
import pytest

from apps.profiles.models import Profile
from apps.workshops.models import Workshop

STATS = "/api/v1/stats/"
SEARCH = "/api/v1/search/"


# ── Статистика ───────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_stats_is_public_and_counts(api, make_user):
    # «Косплееров» считаем по профилям с ролью, а не по всем юзерам.
    Profile.objects.create(user=make_user(), display_name="Cos", roles=["cosplayer"])
    resp = api.get(STATS)
    assert resp.status_code == 200
    assert resp.data["cosplayers"] >= 1
    # ключи навигации присутствуют
    for key in ("workshops", "looks", "teams", "guides", "events", "cities"):
        assert key in resp.data


@pytest.mark.django_db
def test_stats_cosplayers_counts_role_not_all_users(api, make_user):
    make_user()  # юзер без анкеты косплеера — в счётчик не попадает
    assert api.get(STATS).data["cosplayers"] == 0


@pytest.mark.django_db
def test_stats_counts_workshops(api, make_user):
    Workshop.objects.create(owner=make_user(), name="Цех", type="eva", city="Алматы")
    assert api.get(STATS).data["workshops"] == 1


# ── Поиск ────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_search_short_query_returns_empty(api):
    resp = api.get(SEARCH, {"q": "a"})  # < 2 символов
    assert resp.status_code == 200
    assert resp.data["profiles"] == [] and resp.data["workshops"] == []


@pytest.mark.django_db
def test_search_finds_profile_by_name(api, make_user):
    u = make_user(username="naruto_kz", email="n@example.com")
    Profile.objects.create(user=u, display_name="Naruto", roles=["cosplayer"])
    resp = api.get(SEARCH, {"q": "Naruto"})
    names = [p["display_name"] for p in resp.data["profiles"]]
    assert "Naruto" in names


@pytest.mark.django_db
def test_search_finds_workshop_by_name(api, make_user):
    Workshop.objects.create(owner=make_user(), name="EVA Forge", type="eva", city="Алматы")
    resp = api.get(SEARCH, {"q": "Forge"})
    assert any(w["name"] == "EVA Forge" for w in resp.data["workshops"])


@pytest.mark.django_db
def test_search_is_anonymous(api):
    assert api.get(SEARCH, {"q": "косплей"}).status_code == 200
