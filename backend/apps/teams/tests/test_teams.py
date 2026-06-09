"""Тесты команд: создание (капитан), вступление (open/closed), капитанские права, лайк."""
import pytest

from apps.teams.models import Team, TeamLike, TeamMember

TEAMS = "/api/v1/teams/"


def t_url(tid, suffix=""):
    return f"/api/v1/teams/{tid}/{suffix}"


def _team(captain, is_open=True, **kw):
    kw.setdefault("name", "Команда")
    team = Team.objects.create(captain=captain, is_open=is_open, **kw)
    TeamMember.objects.create(team=team, user=captain, role_in_team="Капитан", status="member")
    return team


def _results(data):
    return data["results"] if isinstance(data, dict) else data


# ── Создание ─────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_create_makes_creator_captain(api, make_user):
    user = make_user()
    api.force_authenticate(user=user)
    resp = api.post(TEAMS, {"name": "Mondstadt"}, format="json")
    assert resp.status_code == 201
    team = Team.objects.get()
    assert team.captain == user
    m = TeamMember.objects.get(team=team, user=user)
    assert m.status == "member" and m.role_in_team == "Капитан"


@pytest.mark.django_db
def test_create_requires_auth(api):
    assert api.post(TEAMS, {"name": "X"}).status_code == 403


# ── Вступление ───────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_join_open_team_becomes_member(api, make_user):
    captain = make_user(username="cap", email="cap@example.com")
    joiner = make_user(username="j", email="j@example.com")
    team = _team(captain, is_open=True)
    api.force_authenticate(user=joiner)
    resp = api.post(t_url(team.id, "join/"))
    assert resp.status_code == 200
    assert resp.data["my_status"] == "member"


@pytest.mark.django_db
def test_join_closed_team_is_pending(api, make_user):
    captain = make_user(username="cap", email="cap@example.com")
    joiner = make_user(username="j", email="j@example.com")
    team = _team(captain, is_open=False)
    api.force_authenticate(user=joiner)
    resp = api.post(t_url(team.id, "join/"))
    assert resp.data["my_status"] == "pending"


@pytest.mark.django_db
def test_captain_cannot_join_own(api, make_user):
    captain = make_user()
    team = _team(captain)
    api.force_authenticate(user=captain)
    assert api.post(t_url(team.id, "join/")).status_code == 400


@pytest.mark.django_db
def test_member_can_leave(api, make_user):
    captain = make_user(username="cap", email="cap@example.com")
    member = make_user(username="m", email="m@example.com")
    team = _team(captain)
    TeamMember.objects.create(team=team, user=member, status="member")
    api.force_authenticate(user=member)
    api.delete(t_url(team.id, "leave/"))
    assert not TeamMember.objects.filter(team=team, user=member).exists()


@pytest.mark.django_db
def test_captain_cannot_leave(api, make_user):
    captain = make_user()
    team = _team(captain)
    api.force_authenticate(user=captain)
    assert api.delete(t_url(team.id, "leave/")).status_code == 400


# ── Лайк ─────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_like_toggle(api, make_user):
    captain = make_user(username="cap", email="cap@example.com")
    fan = make_user(username="fan", email="fan@example.com")
    team = _team(captain)
    api.force_authenticate(user=fan)
    on = api.post(t_url(team.id, "like/"))
    assert on.data == {"likes_count": 1, "is_liked": True}
    off = api.delete(t_url(team.id, "like/"))
    assert off.data == {"likes_count": 0, "is_liked": False}


# ── Капитанские права ────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_captain_approves_pending_member(api, make_user):
    captain = make_user(username="cap", email="cap@example.com")
    joiner = make_user(username="j", email="j@example.com")
    team = _team(captain, is_open=False)
    TeamMember.objects.create(team=team, user=joiner, status="pending")
    api.force_authenticate(user=captain)
    resp = api.post(t_url(team.id, f"members/{joiner.id}/"), {"action": "approve"}, format="json")
    assert resp.status_code == 200
    assert TeamMember.objects.get(team=team, user=joiner).status == "member"


@pytest.mark.django_db
def test_captain_removes_member(api, make_user):
    captain = make_user(username="cap", email="cap@example.com")
    member = make_user(username="m", email="m@example.com")
    team = _team(captain)
    TeamMember.objects.create(team=team, user=member, status="member")
    api.force_authenticate(user=captain)
    resp = api.post(t_url(team.id, f"members/{member.id}/"), {"action": "remove"}, format="json")
    assert resp.status_code == 200
    assert not TeamMember.objects.filter(team=team, user=member).exists()


@pytest.mark.django_db
def test_non_captain_cannot_manage_members(api, make_user):
    captain = make_user(username="cap", email="cap@example.com")
    member = make_user(username="m", email="m@example.com")
    stranger = make_user(username="s", email="s@example.com")
    team = _team(captain)
    TeamMember.objects.create(team=team, user=member, status="member")
    api.force_authenticate(user=stranger)
    resp = api.post(t_url(team.id, f"members/{member.id}/"), {"action": "remove"}, format="json")
    assert resp.status_code == 403
    assert TeamMember.objects.filter(team=team, user=member).exists()


@pytest.mark.django_db
def test_non_captain_cannot_update_team(api, make_user):
    captain = make_user(username="cap", email="cap@example.com")
    stranger = make_user(username="s", email="s@example.com")
    team = _team(captain, name="оригинал")
    api.force_authenticate(user=stranger)
    resp = api.patch(t_url(team.id), {"name": "взлом"}, format="json")
    assert resp.status_code == 403
    team.refresh_from_db()
    assert team.name == "оригинал"
