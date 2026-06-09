"""Тесты уведомлений: список своих, счётчик непрочитанного, отметить прочитанными."""
import pytest

from apps.notifications.models import Notification, notify

LIST = "/api/v1/notifications/"
UNREAD = "/api/v1/notifications/unread-count/"
MARK = "/api/v1/notifications/mark-read/"


@pytest.mark.django_db
def test_requires_auth(api):
    assert api.get(LIST).status_code == 403
    assert api.get(UNREAD).status_code == 403


@pytest.mark.django_db
def test_list_shows_only_own(api, make_user):
    me = make_user(username="me", email="me@example.com")
    other = make_user(username="o", email="o@example.com")
    notify(me, "system", "моё")
    notify(other, "system", "чужое")
    api.force_authenticate(user=me)
    resp = api.get(LIST)
    assert resp.status_code == 200
    assert [n["text"] for n in resp.data] == ["моё"]


@pytest.mark.django_db
def test_unread_count_and_mark_read(api, make_user):
    me = make_user()
    notify(me, "system", "1")
    notify(me, "system", "2")
    api.force_authenticate(user=me)
    assert api.get(UNREAD).data["count"] == 2
    assert api.post(MARK).status_code == 204
    assert api.get(UNREAD).data["count"] == 0
    assert Notification.objects.filter(recipient=me, is_read=False).count() == 0


@pytest.mark.django_db
def test_mark_read_does_not_touch_others(api, make_user):
    me = make_user(username="me", email="me@example.com")
    other = make_user(username="o", email="o@example.com")
    notify(other, "system", "чужое непрочитанное")
    api.force_authenticate(user=me)
    api.post(MARK)
    assert Notification.objects.filter(recipient=other, is_read=False).count() == 1
