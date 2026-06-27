"""Тесты съёмок (сбор команды): создание, заявка/инвайт, подтверждение, доступы, фильтры."""
import pytest

from apps.shoots.models import Shoot, ShootParticipant

SHOOTS = "/api/v1/shoots/"
MINE = "/api/v1/shoots/mine/"


def _shoot(organizer, **kw):
    kw.setdefault("title", "Genshin на закате")
    kw.setdefault("city", "Алматы")
    kw.setdefault("looking_for", ["cosplayer", "photographer"])
    return Shoot.objects.create(organizer=organizer, **kw)


# ── Создание / витрина ────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_create_shoot_sets_organizer(api, make_user):
    user = make_user()
    api.force_authenticate(user=user)
    resp = api.post(SHOOTS, {"title": "Съёмка", "city": "Астана",
                             "looking_for": ["photographer"]}, format="json")
    assert resp.status_code == 201
    assert resp.data["organizer_id"] == user.id
    assert resp.data["status"] == "open"


@pytest.mark.django_db
def test_create_requires_auth(api):
    assert api.post(SHOOTS, {"title": "X"}, format="json").status_code == 403


@pytest.mark.django_db
def test_create_cleans_invalid_roles(api, make_user):
    user = make_user()
    api.force_authenticate(user=user)
    resp = api.post(SHOOTS, {"title": "S", "looking_for": ["cosplayer", "wizard"]}, format="json")
    assert resp.status_code == 201
    assert resp.data["looking_for"] == ["cosplayer"]


@pytest.mark.django_db
def test_list_public_hides_inactive(api, make_user):
    u = make_user()
    _shoot(u, title="Видна")
    _shoot(u, title="Скрыта", is_active=False)
    data = api.get(SHOOTS).data
    results = data["results"] if isinstance(data, dict) else data
    titles = [s["title"] for s in results]
    assert "Видна" in titles and "Скрыта" not in titles


@pytest.mark.django_db
def test_filter_by_role(api, make_user):
    u = make_user()
    _shoot(u, title="Нужен фотограф", looking_for=["photographer"])
    _shoot(u, title="Нужен косплеер", looking_for=["cosplayer"])
    data = api.get(f"{SHOOTS}?role=photographer").data
    results = data["results"] if isinstance(data, dict) else data
    titles = [s["title"] for s in results]
    assert "Нужен фотограф" in titles and "Нужен косплеер" not in titles


# ── Заявки / приглашения ───────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_join_creates_request(api, make_user):
    org = make_user(username="org", email="org@e.com")
    shoot = _shoot(org)
    guest = make_user(username="guest", email="g@e.com")
    api.force_authenticate(user=guest)
    resp = api.post(f"{SHOOTS}{shoot.id}/join/", {"role": "photographer"}, format="json")
    assert resp.status_code == 201
    p = ShootParticipant.objects.get(shoot=shoot, user=guest)
    assert p.status == "requested" and p.role == "photographer"


@pytest.mark.django_db
def test_organizer_cannot_join_own(api, make_user):
    org = make_user()
    shoot = _shoot(org)
    api.force_authenticate(user=org)
    assert api.post(f"{SHOOTS}{shoot.id}/join/", {"role": "cosplayer"}, format="json").status_code == 400


@pytest.mark.django_db
def test_join_then_leave(api, make_user):
    org = make_user(username="o", email="o@e.com")
    shoot = _shoot(org)
    guest = make_user(username="g", email="g2@e.com")
    api.force_authenticate(user=guest)
    api.post(f"{SHOOTS}{shoot.id}/join/", {"role": "cosplayer"}, format="json")
    assert api.delete(f"{SHOOTS}{shoot.id}/join/").status_code == 204
    assert not ShootParticipant.objects.filter(shoot=shoot, user=guest).exists()


@pytest.mark.django_db
def test_organizer_invites(api, make_user):
    org = make_user(username="o", email="o@e.com")
    shoot = _shoot(org)
    target = make_user(username="t", email="t@e.com")
    api.force_authenticate(user=org)
    resp = api.post(f"{SHOOTS}{shoot.id}/invite/",
                    {"user_id": target.id, "role": "model"}, format="json")
    assert resp.status_code == 201
    assert ShootParticipant.objects.get(shoot=shoot, user=target).status == "invited"


@pytest.mark.django_db
def test_non_organizer_cannot_invite(api, make_user):
    org = make_user(username="o", email="o@e.com")
    shoot = _shoot(org)
    intruder = make_user(username="i", email="i@e.com")
    target = make_user(username="t", email="t@e.com")
    api.force_authenticate(user=intruder)
    resp = api.post(f"{SHOOTS}{shoot.id}/invite/",
                    {"user_id": target.id, "role": "model"}, format="json")
    assert resp.status_code == 403


# ── Управление участниками ──────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_organizer_confirms_request(api, make_user):
    org = make_user(username="o", email="o@e.com")
    shoot = _shoot(org)
    guest = make_user(username="g", email="g@e.com")
    part = ShootParticipant.objects.create(shoot=shoot, user=guest, role="cosplayer", status="requested")
    api.force_authenticate(user=org)
    resp = api.post(f"{SHOOTS}{shoot.id}/participants/{part.id}/",
                    {"action": "confirm"}, format="json")
    assert resp.status_code == 200
    part.refresh_from_db()
    assert part.status == "confirmed"
    assert resp.data["confirmed_count"] == 1


@pytest.mark.django_db
def test_invited_user_confirms_own(api, make_user):
    org = make_user(username="o", email="o@e.com")
    shoot = _shoot(org)
    target = make_user(username="t", email="t@e.com")
    part = ShootParticipant.objects.create(shoot=shoot, user=target, role="model", status="invited")
    api.force_authenticate(user=target)
    resp = api.post(f"{SHOOTS}{shoot.id}/participants/{part.id}/",
                    {"action": "confirm"}, format="json")
    assert resp.status_code == 200
    part.refresh_from_db()
    assert part.status == "confirmed"


@pytest.mark.django_db
def test_stranger_cannot_manage_participant(api, make_user):
    org = make_user(username="o", email="o@e.com")
    shoot = _shoot(org)
    guest = make_user(username="g", email="g@e.com")
    stranger = make_user(username="s", email="s@e.com")
    part = ShootParticipant.objects.create(shoot=shoot, user=guest, status="requested")
    api.force_authenticate(user=stranger)
    resp = api.post(f"{SHOOTS}{shoot.id}/participants/{part.id}/",
                    {"action": "confirm"}, format="json")
    assert resp.status_code == 403


# ── Мои съёмки ──────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_my_shoots_splits_organized_and_participating(api, make_user):
    org = make_user(username="o", email="o@e.com")
    other = make_user(username="x", email="x@e.com")
    mine = _shoot(org, title="Моя")
    foreign = _shoot(other, title="Чужая")
    ShootParticipant.objects.create(shoot=foreign, user=org, role="cosplayer", status="confirmed")

    api.force_authenticate(user=org)
    data = api.get(MINE).data
    assert [s["title"] for s in data["organized"]] == ["Моя"]
    assert [s["title"] for s in data["participating"]] == ["Чужая"]


@pytest.mark.django_db
def test_requests_visible_only_to_organizer(api, make_user):
    org = make_user(username="o", email="o@e.com")
    shoot = _shoot(org)
    guest = make_user(username="g", email="g@e.com")
    ShootParticipant.objects.create(shoot=shoot, user=guest, status="requested")

    # организатор видит заявки
    api.force_authenticate(user=org)
    assert api.get(f"{SHOOTS}{shoot.id}/").data["requests"] is not None
    # посторонний — нет
    api.force_authenticate(user=guest)
    assert api.get(f"{SHOOTS}{shoot.id}/").data["requests"] is None
