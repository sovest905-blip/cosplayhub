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
