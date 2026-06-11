"""Тесты событий: читают все, создаёт/правит/удаляет только staff."""
import datetime

import pytest

from apps.events.models import Event

EVENTS = "/api/v1/events/"


@pytest.mark.django_db
def test_anon_can_read(api):
    Event.objects.create(title="фест", date=datetime.date(2026, 9, 1), city="Алматы")
    assert api.get(EVENTS).status_code == 200


@pytest.mark.django_db
def test_regular_user_cannot_create(api, make_user):
    api.force_authenticate(user=make_user())
    resp = api.post(EVENTS, {"title": "сходка", "date": "2026-09-01"}, format="json")
    assert resp.status_code == 403


@pytest.mark.django_db
def test_staff_can_create(api, make_user):
    api.force_authenticate(user=make_user(is_staff=True))
    resp = api.post(EVENTS, {"title": "конвент", "date": "2026-09-01", "city": "Астана"}, format="json")
    assert resp.status_code == 201
    assert Event.objects.get().title == "конвент"


# ── «Пойду» ─────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_attend_and_unattend(api, make_user):
    ev = Event.objects.create(title="фест", date=datetime.date(2026, 9, 1), going=10)
    user = make_user()
    api.force_authenticate(user=user)

    resp = api.post(f"{EVENTS}{ev.id}/attend/")
    assert resp.status_code == 200
    assert resp.data["is_going"] is True
    assert resp.data["going_total"] == 11      # ручной счётчик + отметка

    # Повторный POST не дублирует отметку
    assert api.post(f"{EVENTS}{ev.id}/attend/").data["going_total"] == 11

    resp = api.delete(f"{EVENTS}{ev.id}/attend/")
    assert resp.data["is_going"] is False
    assert resp.data["going_total"] == 10


@pytest.mark.django_db
def test_attend_requires_auth(api):
    ev = Event.objects.create(title="фест", date=datetime.date(2026, 9, 1))
    assert api.post(f"{EVENTS}{ev.id}/attend/").status_code == 403


@pytest.mark.django_db
def test_mine_returns_upcoming_attended(api, make_user):
    user = make_user()
    future = Event.objects.create(title="скоро", date=datetime.date.today() + datetime.timedelta(days=7))
    past = Event.objects.create(title="прошло", date=datetime.date.today() - datetime.timedelta(days=7))
    api.force_authenticate(user=user)
    api.post(f"{EVENTS}{future.id}/attend/")
    api.post(f"{EVENTS}{past.id}/attend/")

    resp = api.get(f"{EVENTS}mine/")
    assert resp.status_code == 200
    titles = [e["title"] for e in resp.data]
    assert titles == ["скоро"]                  # прошедшие не показываем
