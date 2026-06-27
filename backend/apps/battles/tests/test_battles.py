"""Тесты косплей-баттлов: создание, статус по датам, заявки своим образом, голосование."""
from datetime import timedelta

import pytest
from django.utils import timezone

from apps.battles.models import Battle, BattleEntry, BattleVote
from apps.looks.models import Look

BATTLES = "/api/v1/battles/"


def _battle(creator=None, **kw):
    kw.setdefault("title", "Лучший Genshin-косплей")
    return Battle.objects.create(created_by=creator, **kw)


def _look(author, title="Образ"):
    return Look.objects.create(author=author, title=title)


@pytest.mark.django_db
def test_create_battle_sets_creator(api, make_user):
    user = make_user()
    api.force_authenticate(user=user)
    resp = api.post(BATTLES, {"title": "Баттл", "theme": "Аниме"})
    assert resp.status_code == 201
    assert resp.data["status"] == "voting"  # без дат — голосование открыто


@pytest.mark.django_db
def test_create_requires_auth(api):
    assert api.post(BATTLES, {"title": "X"}).status_code == 403


@pytest.mark.django_db
def test_status_by_dates(make_user):
    today = timezone.localdate()
    up = _battle(starts_at=today + timedelta(days=2))
    fin = _battle(ends_at=today - timedelta(days=1))
    vote = _battle(starts_at=today - timedelta(days=1), ends_at=today + timedelta(days=1))
    assert up.status == "upcoming"
    assert fin.status == "finished"
    assert vote.status == "voting"


@pytest.mark.django_db
def test_list_hides_inactive(api, make_user):
    _battle(title="Виден")
    _battle(title="Скрыт", is_active=False)
    data = api.get(BATTLES).data
    results = data["results"] if isinstance(data, dict) else data
    titles = [b["title"] for b in results]
    assert "Виден" in titles and "Скрыт" not in titles


@pytest.mark.django_db
def test_enter_own_look(api, make_user):
    user = make_user()
    battle = _battle()
    look = _look(user)
    api.force_authenticate(user=user)
    resp = api.post(f"{BATTLES}{battle.id}/enter/", {"look_id": look.id}, format="json")
    assert resp.status_code == 201
    assert BattleEntry.objects.filter(battle=battle, look=look, user=user).exists()


@pytest.mark.django_db
def test_cannot_enter_foreign_look(api, make_user):
    owner = make_user(username="o", email="o@e.com")
    other = make_user(username="x", email="x@e.com")
    battle = _battle()
    look = _look(owner)
    api.force_authenticate(user=other)
    assert api.post(f"{BATTLES}{battle.id}/enter/", {"look_id": look.id}, format="json").status_code == 403


@pytest.mark.django_db
def test_cannot_enter_finished(api, make_user):
    user = make_user()
    battle = _battle(ends_at=timezone.localdate() - timedelta(days=1))
    look = _look(user)
    api.force_authenticate(user=user)
    assert api.post(f"{BATTLES}{battle.id}/enter/", {"look_id": look.id}, format="json").status_code == 400


@pytest.mark.django_db
def test_one_entry_per_user(api, make_user):
    user = make_user()
    battle = _battle()
    api.force_authenticate(user=user)
    api.post(f"{BATTLES}{battle.id}/enter/", {"look_id": _look(user, "a").id}, format="json")
    resp = api.post(f"{BATTLES}{battle.id}/enter/", {"look_id": _look(user, "b").id}, format="json")
    assert resp.status_code == 400


@pytest.mark.django_db
def test_vote_counts_and_moves(api, make_user):
    a = make_user(username="a", email="a@e.com")
    b = make_user(username="b", email="b@e.com")
    voter = make_user(username="v", email="v@e.com")
    battle = _battle()
    ea = BattleEntry.objects.create(battle=battle, look=_look(a, "A"), user=a)
    eb = BattleEntry.objects.create(battle=battle, look=_look(b, "B"), user=b)

    api.force_authenticate(user=voter)
    r1 = api.post(f"{BATTLES}{battle.id}/vote/", {"entry_id": ea.id}, format="json")
    assert r1.status_code == 201
    assert BattleVote.objects.filter(battle=battle, user=voter, entry=ea).exists()
    # сменить голос на B → один голос на баттл
    api.post(f"{BATTLES}{battle.id}/vote/", {"entry_id": eb.id}, format="json")
    assert BattleVote.objects.filter(battle=battle, user=voter).count() == 1
    assert BattleVote.objects.get(battle=battle, user=voter).entry_id == eb.id


@pytest.mark.django_db
def test_cannot_vote_own_entry(api, make_user):
    a = make_user()
    battle = _battle()
    ea = BattleEntry.objects.create(battle=battle, look=_look(a, "A"), user=a)
    api.force_authenticate(user=a)
    assert api.post(f"{BATTLES}{battle.id}/vote/", {"entry_id": ea.id}, format="json").status_code == 400


@pytest.mark.django_db
def test_cannot_vote_when_finished(api, make_user):
    a = make_user(username="a", email="a@e.com")
    voter = make_user(username="v", email="v@e.com")
    battle = _battle(ends_at=timezone.localdate() - timedelta(days=1))
    ea = BattleEntry.objects.create(battle=battle, look=_look(a, "A"), user=a)
    api.force_authenticate(user=voter)
    assert api.post(f"{BATTLES}{battle.id}/vote/", {"entry_id": ea.id}, format="json").status_code == 400


@pytest.mark.django_db
def test_leaderboard_sorted_by_votes(api, make_user):
    a = make_user(username="a", email="a@e.com")
    b = make_user(username="b", email="b@e.com")
    v1 = make_user(username="v1", email="v1@e.com")
    v2 = make_user(username="v2", email="v2@e.com")
    battle = _battle()
    ea = BattleEntry.objects.create(battle=battle, look=_look(a, "A"), user=a)
    eb = BattleEntry.objects.create(battle=battle, look=_look(b, "B"), user=b)
    BattleVote.objects.create(battle=battle, user=v1, entry=eb)
    BattleVote.objects.create(battle=battle, user=v2, entry=eb)
    BattleVote.objects.create(battle=battle, user=a, entry=eb)

    data = api.get(f"{BATTLES}{battle.id}/").data
    assert data["entries"][0]["id"] == eb.id
    assert data["entries"][0]["votes_count"] == 3
