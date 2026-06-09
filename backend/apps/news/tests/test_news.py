"""Тесты новостей: читают все, создаёт/правит/удаляет только staff."""
import pytest

from apps.news.models import News

NEWS = "/api/v1/news/"


def _results(data):
    return data["results"] if isinstance(data, dict) else data


@pytest.mark.django_db
def test_anon_can_read(api, make_user):
    News.objects.create(title="новость", author=make_user())
    assert api.get(NEWS).status_code == 200


@pytest.mark.django_db
def test_anon_sees_published_only(api, make_user):
    a = make_user()
    News.objects.create(title="видна", author=a, is_published=True)
    News.objects.create(title="скрыта", author=a, is_published=False)
    titles = [n["title"] for n in _results(api.get(NEWS).data)]
    assert "видна" in titles and "скрыта" not in titles


@pytest.mark.django_db
def test_regular_user_cannot_create(api, make_user):
    api.force_authenticate(user=make_user())
    assert api.post(NEWS, {"title": "спам"}, format="json").status_code == 403


@pytest.mark.django_db
def test_staff_can_create(api, make_user):
    staff = make_user(is_staff=True)
    api.force_authenticate(user=staff)
    resp = api.post(NEWS, {"title": "анонс"}, format="json")
    assert resp.status_code == 201
    assert News.objects.get().author == staff


@pytest.mark.django_db
def test_regular_user_cannot_delete(api, make_user):
    n = News.objects.create(title="x", author=make_user(username="a", email="a@example.com"))
    api.force_authenticate(user=make_user(username="u", email="u@example.com"))
    assert api.delete(f"{NEWS}{n.id}/").status_code == 403
