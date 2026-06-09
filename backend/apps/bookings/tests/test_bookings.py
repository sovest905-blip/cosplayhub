"""Тесты слотов аренды и броней: витрина, заявки, решения владельца, изоляция."""
from datetime import date, time, timedelta

import pytest

from apps.bookings.models import Booking, Slot
from apps.notifications.models import Notification

SLOTS = "/api/v1/slots/"
MINE = "/api/v1/bookings/mine/"

TOMORROW = date.today() + timedelta(days=1)


@pytest.fixture
def make_slot(db):
    def _make(owner, d=TOMORROW, start=time(12, 0), end=time(14, 0), **kw):
        return Slot.objects.create(owner=owner, date=d, time_start=start, time_end=end, **kw)
    return _make


# ── Витрина ─────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_public_slots_by_owner(api, make_user, make_slot):
    owner = make_user(username="loft")
    make_slot(owner, price=5000)
    make_slot(owner, is_active=False)                       # скрытый — не виден
    make_slot(owner, d=date.today() - timedelta(days=1))    # прошедший — не виден
    resp = api.get(SLOTS, {"owner": owner.id})
    data = resp.data["results"] if isinstance(resp.data, dict) else resp.data
    assert resp.status_code == 200
    assert len(data) == 1
    assert data[0]["price"] == 5000
    assert data[0]["requests"] is None  # заявки гостям не видны


@pytest.mark.django_db
def test_mine_shows_all_slots(api, make_user, make_slot):
    owner = make_user()
    make_slot(owner, is_active=False)
    make_slot(owner, d=date.today() - timedelta(days=2))
    api.force_authenticate(user=owner)
    resp = api.get(SLOTS, {"mine": 1})
    data = resp.data["results"] if isinstance(resp.data, dict) else resp.data
    assert len(data) == 2


# ── CRUD слотов ────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_create_slot_requires_auth(api):
    assert api.post(SLOTS, {"date": str(TOMORROW), "time_start": "12:00", "time_end": "14:00"}).status_code == 403


@pytest.mark.django_db
def test_owner_crud_slot(api, make_user, make_slot):
    owner = make_user()
    api.force_authenticate(user=owner)
    resp = api.post(SLOTS, {"date": str(TOMORROW), "time_start": "12:00", "time_end": "14:00", "price": 7000})
    assert resp.status_code == 201
    sid = resp.data["id"]
    assert api.patch(f"{SLOTS}{sid}/", {"price": 8000}).data["price"] == 8000
    assert api.delete(f"{SLOTS}{sid}/").status_code == 204


@pytest.mark.django_db
def test_stranger_cannot_edit_slot(api, make_user, make_slot):
    slot = make_slot(make_user())
    api.force_authenticate(user=make_user())
    assert api.patch(f"{SLOTS}{slot.id}/", {"price": 1}).status_code == 403
    assert api.delete(f"{SLOTS}{slot.id}/").status_code == 403


# ── Бронирование ───────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_book_creates_pending_and_notifies_owner(api, make_user, make_slot):
    owner, guest = make_user(), make_user(username="guest")
    slot = make_slot(owner)
    api.force_authenticate(user=guest)
    resp = api.post(f"{SLOTS}{slot.id}/book/", {"comment": "съёмка в 2 часа"})
    assert resp.status_code == 201
    assert resp.data["my_booking"] == "pending"
    assert Booking.objects.get(slot=slot, user=guest).comment == "съёмка в 2 часа"
    assert Notification.objects.filter(recipient=owner).exists()


@pytest.mark.django_db
def test_book_idempotent(api, make_user, make_slot):
    slot = make_slot(make_user())
    guest = make_user()
    api.force_authenticate(user=guest)
    api.post(f"{SLOTS}{slot.id}/book/")
    api.post(f"{SLOTS}{slot.id}/book/")
    assert Booking.objects.filter(slot=slot, user=guest).count() == 1


@pytest.mark.django_db
def test_cannot_book_own_or_inactive_slot(api, make_user, make_slot):
    owner = make_user()
    slot = make_slot(owner)
    hidden = make_slot(make_user(), is_active=False)
    api.force_authenticate(user=owner)
    assert api.post(f"{SLOTS}{slot.id}/book/").status_code == 400
    assert api.post(f"{SLOTS}{hidden.id}/book/").status_code == 404  # вне queryset


@pytest.mark.django_db
def test_cancel_booking(api, make_user, make_slot):
    slot = make_slot(make_user())
    guest = make_user()
    api.force_authenticate(user=guest)
    api.post(f"{SLOTS}{slot.id}/book/")
    assert api.delete(f"{SLOTS}{slot.id}/book/").status_code == 204
    assert Booking.objects.get(slot=slot, user=guest).status == "cancelled"


# ── Решение владельца ──────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_owner_approves_booking_others_declined(api, make_user, make_slot):
    owner, g1, g2 = make_user(), make_user(), make_user()
    slot = make_slot(owner)
    b1 = Booking.objects.create(slot=slot, user=g1)
    b2 = Booking.objects.create(slot=slot, user=g2)

    api.force_authenticate(user=owner)
    resp = api.post(f"/api/v1/bookings/{b1.id}/", {"status": "approved"}, format="json")
    assert resp.status_code == 200
    assert resp.data["is_booked"] is True
    b1.refresh_from_db(); b2.refresh_from_db()
    assert b1.status == "approved"
    assert b2.status == "declined"  # конкурирующая заявка отклонена
    assert Notification.objects.filter(recipient=g1).exists()
    assert Notification.objects.filter(recipient=g2).exists()


@pytest.mark.django_db
def test_stranger_cannot_decide_booking(api, make_user, make_slot):
    slot = make_slot(make_user())
    b = Booking.objects.create(slot=slot, user=make_user())
    api.force_authenticate(user=make_user())
    assert api.post(f"/api/v1/bookings/{b.id}/", {"status": "approved"}, format="json").status_code == 403


@pytest.mark.django_db
def test_booked_slot_rejects_new_requests(api, make_user, make_slot):
    slot = make_slot(make_user())
    Booking.objects.create(slot=slot, user=make_user(), status="approved")
    api.force_authenticate(user=make_user())
    assert api.post(f"{SLOTS}{slot.id}/book/").status_code == 400


@pytest.mark.django_db
def test_my_bookings_list(api, make_user, make_slot):
    guest = make_user()
    slot = make_slot(make_user(username="studio51"), price=9000)
    Booking.objects.create(slot=slot, user=guest)
    api.force_authenticate(user=guest)
    resp = api.get(MINE)
    assert resp.status_code == 200
    assert resp.data[0]["slot"]["owner_name"] == "studio51"


# ── Заявки в сериализаторе ─────────────────────────────────────────────────────

@pytest.mark.django_db
def test_requests_visible_to_owner_only(api, make_user, make_slot):
    owner, guest = make_user(), make_user(username="wantit")
    slot = make_slot(owner)
    Booking.objects.create(slot=slot, user=guest, comment="хочу")
    api.force_authenticate(user=owner)
    resp = api.get(SLOTS, {"mine": 1})
    data = resp.data["results"] if isinstance(resp.data, dict) else resp.data
    assert data[0]["requests"][0]["username"] == "wantit"


# ── Админ-панель ───────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_admin_slots_crud_for_user(api, make_user, make_slot):
    owner = make_user()
    slot = make_slot(owner)
    api.force_authenticate(user=make_user(is_staff=True))

    resp = api.get(f"/api/v1/admin-panel/users/{owner.id}/slots/")
    assert resp.status_code == 200 and len(resp.data) == 1

    resp = api.post(f"/api/v1/admin-panel/users/{owner.id}/slots/",
                    {"date": str(TOMORROW), "time_start": "10:00", "time_end": "11:00"})
    assert resp.status_code == 201

    resp = api.patch(f"/api/v1/admin-panel/slots/{slot.id}/", {"price": 123}, format="json")
    assert resp.data["price"] == 123
    assert api.delete(f"/api/v1/admin-panel/slots/{slot.id}/").status_code == 204


@pytest.mark.django_db
def test_admin_slots_not_for_regular_user(api, make_user):
    user = make_user()
    api.force_authenticate(user=user)
    assert api.get(f"/api/v1/admin-panel/users/{user.id}/slots/").status_code == 403
