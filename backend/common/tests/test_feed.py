"""Тесты персональной ленты /feed/: подписки, фандомы, события по городу, фолбэк."""
import pytest

from apps.events.models import Event
from apps.looks.models import Look
from apps.news.models import News
from apps.profiles.models import Follow, Profile
from datetime import date, timedelta

FEED = "/api/v1/feed/"


def _profile(user, fandoms="", roles=None):
    return Profile.objects.create(
        user=user, display_name=user.username, roles=roles or ["fan"],
        role_details={"cosplayer": {"fandoms": fandoms}},
    )


@pytest.mark.django_db
def test_requires_auth(api):
    assert api.get(FEED).status_code == 403


@pytest.mark.django_db
def test_followed_authors_looks_in_feed(api, make_user):
    me = make_user(username="me")
    _profile(me)
    star = make_user(username="star")
    Look.objects.create(author=star, title="Райден", is_published=True)
    Follow.objects.create(follower=me, target=star)
    api.force_authenticate(user=me)

    data = api.get(FEED).data
    assert data["personalized"] is True
    look_items = [i for i in data["items"] if i["type"] == "look"]
    assert any(i["title"] == "Райден" and "подписаны" in i["reason"] for i in look_items)


@pytest.mark.django_db
def test_fandom_match_in_feed(api, make_user):
    me = make_user(username="me")
    _profile(me, fandoms="Genshin Impact, Naruto")
    author = make_user(username="author")
    Look.objects.create(author=author, title="Косплей", character="Genshin Impact — Райден", is_published=True)
    api.force_authenticate(user=me)

    data = api.get(FEED).data
    assert data["personalized"] is True
    assert any("интересу" in i["reason"] for i in data["items"] if i["type"] == "look")


@pytest.mark.django_db
def test_city_events_prioritized(api, make_user):
    me = make_user(username="me", city="Алматы")
    _profile(me)
    Event.objects.create(title="Сходка Алматы", city="Алматы", date=date.today() + timedelta(days=5), is_published=True)
    Event.objects.create(title="Сходка Астана", city="Астана", date=date.today() + timedelta(days=5), is_published=True)
    api.force_authenticate(user=me)

    events = [i for i in api.get(FEED).data["items"] if i["type"] == "event"]
    almaty = next(i for i in events if i["title"] == "Сходка Алматы")
    assert "Алматы" in almaty["reason"]


@pytest.mark.django_db
def test_past_events_excluded(api, make_user):
    me = make_user()
    _profile(me)
    Event.objects.create(title="Прошедшее", date=date.today() - timedelta(days=3), is_published=True)
    api.force_authenticate(user=me)
    assert not any(i["title"] == "Прошедшее" for i in api.get(FEED).data["items"])


@pytest.mark.django_db
def test_fallback_not_empty_without_interests(api, make_user):
    """Юзер без подписок/фандомов: лента не персональная, но не пустая (свежие образы)."""
    me = make_user()
    _profile(me, fandoms="")
    other = make_user(username="other")
    Look.objects.create(author=other, title="Образ", is_published=True)
    api.force_authenticate(user=me)

    data = api.get(FEED).data
    assert data["personalized"] is False
    assert any(i["type"] == "look" for i in data["items"])


@pytest.mark.django_db
def test_news_in_feed(api, make_user):
    me = make_user()
    _profile(me)
    News.objects.create(title="Открыта бета", is_published=True, is_pinned=True)
    api.force_authenticate(user=me)
    assert any(i["type"] == "news" and i["title"] == "Открыта бета" for i in api.get(FEED).data["items"])


@pytest.mark.django_db
def test_unpublished_look_excluded(api, make_user):
    me = make_user(username="me")
    _profile(me)
    star = make_user(username="star")
    Look.objects.create(author=star, title="Черновик", is_published=False)
    Follow.objects.create(follower=me, target=star)
    api.force_authenticate(user=me)
    assert not any(i["title"] == "Черновик" for i in api.get(FEED).data["items"])


@pytest.mark.django_db
def test_popular_look_ranks_higher(api, make_user):
    """При равной релевантности образ с большим числом лайков — выше."""
    from apps.looks.models import LookLike
    me = make_user(username="me")
    _profile(me, fandoms="Genshin")
    a1 = make_user(username="a1")
    a2 = make_user(username="a2")
    cold = Look.objects.create(author=a1, title="A", character="Genshin", is_published=True)
    hot = Look.objects.create(author=a2, title="B", character="Genshin", is_published=True)
    for i in range(5):
        LookLike.objects.create(user=make_user(username=f"f{i}"), look=hot)
    api.force_authenticate(user=me)

    looks = [i for i in api.get(FEED).data["items"] if i["type"] == "look"]
    titles = [i["title"] for i in looks]
    assert titles.index("B") < titles.index("A")  # популярный выше


@pytest.mark.django_db
def test_author_diversity_cap(api, make_user):
    """Один автор не заполняет ленту: не больше 5 его образов в выдаче."""
    me = make_user(username="me")
    _profile(me)
    star = make_user(username="star")
    for i in range(9):
        Look.objects.create(author=star, title=f"L{i}", is_published=True)
    Follow.objects.create(follower=me, target=star)
    api.force_authenticate(user=me)

    star_looks = [i for i in api.get(FEED).data["items"] if i["type"] == "look" and i["author"] == "star"]
    assert len(star_looks) <= 5
