"""Тесты проката костюмов: создание, витрина, заявка/отмена, подтверждение, доступы."""
import pytest

from apps.rentals.models import Costume, RentalRequest

COSTUMES = "/api/v1/costumes/"
MINE = "/api/v1/rentals/mine/"


def _costume(owner, **kw):
    kw.setdefault("title", "Костюм Райдэн")
    kw.setdefault("city", "Алматы")
    kw.setdefault("price_day", 5000)
    return Costume.objects.create(owner=owner, **kw)


@pytest.mark.django_db
def test_create_costume_sets_owner(api, make_user):
    user = make_user()
    api.force_authenticate(user=user)
    resp = api.post(COSTUMES, {"title": "Костюм", "city": "Астана", "price_day": 3000})
    assert resp.status_code == 201
    assert resp.data["owner_id"] == user.id
    assert resp.data["status"] == "available"


@pytest.mark.django_db
def test_create_requires_auth(api):
    assert api.post(COSTUMES, {"title": "X"}).status_code == 403


@pytest.mark.django_db
def test_list_public_hides_inactive(api, make_user):
    u = make_user()
    _costume(u, title="Виден")
    _costume(u, title="Скрыт", is_active=False)
    data = api.get(COSTUMES).data
    results = data["results"] if isinstance(data, dict) else data
    titles = [c["title"] for c in results]
    assert "Виден" in titles and "Скрыт" not in titles


@pytest.mark.django_db
def test_filter_by_owner(api, make_user):
    a = make_user(username="a", email="a@e.com")
    b = make_user(username="b", email="b@e.com")
    _costume(a, title="Костюм A")
    _costume(b, title="Костюм B")
    data = api.get(f"{COSTUMES}?owner={a.id}").data
    results = data["results"] if isinstance(data, dict) else data
    titles = [c["title"] for c in results]
    assert titles == ["Костюм A"]


@pytest.mark.django_db
def test_request_creates_pending(api, make_user):
    owner = make_user(username="o", email="o@e.com")
    costume = _costume(owner)
    renter = make_user(username="r", email="r@e.com")
    api.force_authenticate(user=renter)
    resp = api.post(f"{COSTUMES}{costume.id}/request/", {"comment": "на фест"})
    assert resp.status_code == 201
    assert RentalRequest.objects.get(costume=costume, user=renter).status == "pending"


@pytest.mark.django_db
def test_owner_cannot_request_own(api, make_user):
    owner = make_user()
    costume = _costume(owner)
    api.force_authenticate(user=owner)
    assert api.post(f"{COSTUMES}{costume.id}/request/").status_code == 400


@pytest.mark.django_db
def test_request_is_idempotent(api, make_user):
    owner = make_user(username="o", email="o@e.com")
    costume = _costume(owner)
    renter = make_user(username="r", email="r@e.com")
    api.force_authenticate(user=renter)
    api.post(f"{COSTUMES}{costume.id}/request/")
    api.post(f"{COSTUMES}{costume.id}/request/")
    assert RentalRequest.objects.filter(costume=costume, user=renter).count() == 1


@pytest.mark.django_db
def test_cancel_request(api, make_user):
    owner = make_user(username="o", email="o@e.com")
    costume = _costume(owner)
    renter = make_user(username="r", email="r@e.com")
    api.force_authenticate(user=renter)
    api.post(f"{COSTUMES}{costume.id}/request/")
    assert api.delete(f"{COSTUMES}{costume.id}/request/").status_code == 204
    assert RentalRequest.objects.get(costume=costume, user=renter).status == "cancelled"


@pytest.mark.django_db
def test_owner_approves_request(api, make_user):
    owner = make_user(username="o", email="o@e.com")
    costume = _costume(owner)
    renter = make_user(username="r", email="r@e.com")
    req = RentalRequest.objects.create(costume=costume, user=renter)
    api.force_authenticate(user=owner)
    resp = api.post(f"/api/v1/rentals/{req.id}/", {"status": "approved"}, format="json")
    assert resp.status_code == 200
    req.refresh_from_db()
    assert req.status == "approved"


@pytest.mark.django_db
def test_stranger_cannot_decide(api, make_user):
    owner = make_user(username="o", email="o@e.com")
    costume = _costume(owner)
    renter = make_user(username="r", email="r@e.com")
    stranger = make_user(username="s", email="s@e.com")
    req = RentalRequest.objects.create(costume=costume, user=renter)
    api.force_authenticate(user=stranger)
    assert api.post(f"/api/v1/rentals/{req.id}/", {"status": "approved"}, format="json").status_code == 403


@pytest.mark.django_db
def test_requests_visible_only_to_owner(api, make_user):
    owner = make_user(username="o", email="o@e.com")
    costume = _costume(owner)
    renter = make_user(username="r", email="r@e.com")
    RentalRequest.objects.create(costume=costume, user=renter)
    api.force_authenticate(user=owner)
    assert api.get(f"{COSTUMES}{costume.id}/").data["requests"] is not None
    api.force_authenticate(user=renter)
    assert api.get(f"{COSTUMES}{costume.id}/").data["requests"] is None


@pytest.mark.django_db
def test_my_rentals_lists_own(api, make_user):
    owner = make_user(username="o", email="o@e.com")
    costume = _costume(owner)
    renter = make_user(username="r", email="r@e.com")
    RentalRequest.objects.create(costume=costume, user=renter, comment="мой")
    api.force_authenticate(user=renter)
    resp = api.get(MINE)
    assert resp.status_code == 200
    assert len(resp.data) == 1
    assert resp.data[0]["costume"]["title"] == "Костюм Райдэн"
