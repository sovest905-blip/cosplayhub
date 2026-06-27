"""Тесты WIP-прогресса образов: стадия (planned/wip/done) + этапы работы (LookUpdate)."""
import pytest

from apps.looks.models import Look, LookUpdate

LOOKS = "/api/v1/looks/"


def _look(author, title="Образ", stage="done"):
    return Look.objects.create(author=author, title=title, stage=stage)


@pytest.mark.django_db
def test_default_stage_done(api, make_user):
    user = make_user()
    api.force_authenticate(user=user)
    resp = api.post(LOOKS, {"title": "Новый"}, format="json")
    assert resp.status_code == 201
    assert resp.data["stage"] == "done"


@pytest.mark.django_db
def test_author_sets_stage(api, make_user):
    user = make_user()
    look = _look(user)
    api.force_authenticate(user=user)
    resp = api.patch(f"{LOOKS}{look.id}/", {"stage": "wip"}, format="json")
    assert resp.status_code == 200
    look.refresh_from_db()
    assert look.stage == "wip"


@pytest.mark.django_db
def test_filter_by_stage(api, make_user):
    u = make_user()
    _look(u, "Хочу", stage="planned")
    _look(u, "Готов", stage="done")
    data = api.get(f"{LOOKS}?stage=planned").data
    results = data["results"] if isinstance(data, dict) else data
    titles = [l["title"] for l in results]
    assert "Хочу" in titles and "Готов" not in titles


@pytest.mark.django_db
def test_author_adds_update(api, make_user):
    user = make_user()
    look = _look(user, stage="wip")
    api.force_authenticate(user=user)
    resp = api.post(f"{LOOKS}{look.id}/updates/", {"text": "Сшил основу"})
    assert resp.status_code == 201
    assert LookUpdate.objects.filter(look=look).count() == 1


@pytest.mark.django_db
def test_update_with_workshop(api, make_user, make_workshop):
    user = make_user()
    ws = make_workshop(owner=make_user(username="w", email="w@e.com"))
    look = _look(user, stage="wip")
    api.force_authenticate(user=user)
    resp = api.post(f"{LOOKS}{look.id}/updates/", {"text": "Заказал парик", "workshop": ws.id})
    assert resp.status_code == 201
    assert resp.data["workshop_name"] == ws.name


@pytest.mark.django_db
def test_non_author_cannot_add_update(api, make_user):
    owner = make_user(username="o", email="o@e.com")
    other = make_user(username="x", email="x@e.com")
    look = _look(owner, stage="wip")
    api.force_authenticate(user=other)
    assert api.post(f"{LOOKS}{look.id}/updates/", {"text": "чужое"}).status_code == 403


@pytest.mark.django_db
def test_update_requires_text_or_image(api, make_user):
    user = make_user()
    look = _look(user, stage="wip")
    api.force_authenticate(user=user)
    assert api.post(f"{LOOKS}{look.id}/updates/", {}).status_code == 400


@pytest.mark.django_db
def test_delete_update(api, make_user):
    user = make_user()
    look = _look(user, stage="wip")
    upd = LookUpdate.objects.create(look=look, text="этап")
    api.force_authenticate(user=user)
    assert api.delete(f"{LOOKS}{look.id}/updates/{upd.id}/").status_code == 204
    assert not LookUpdate.objects.filter(pk=upd.id).exists()


@pytest.mark.django_db
def test_updates_in_serializer(api, make_user):
    user = make_user()
    look = _look(user, stage="wip")
    LookUpdate.objects.create(look=look, text="первый этап")
    data = api.get(f"{LOOKS}{look.id}/").data
    assert len(data["updates"]) == 1
    assert data["updates"][0]["text"] == "первый этап"
    assert data["stage_display"] == "В работе"


# ── Продвижение в ленте (Pro 1.5) ─────────────────────────────────────────────────

@pytest.mark.django_db
def test_boost_requires_pro(api, make_user):
    user = make_user()
    look = _look(user)
    api.force_authenticate(user=user)
    assert api.post(f"{LOOKS}{look.id}/boost/").status_code == 403  # без Pro нельзя


@pytest.mark.django_db
def test_boost_sets_flag_for_pro(api, make_user):
    from apps.billing.models import Subscription
    user = make_user()
    Subscription.objects.create(user=user, plan="pro", source="manual")
    look = _look(user)
    api.force_authenticate(user=user)
    resp = api.post(f"{LOOKS}{look.id}/boost/")
    assert resp.status_code == 200 and resp.data["is_boosted"] is True
    assert api.get(f"{LOOKS}{look.id}/").data["is_boosted"] is True
    # снять
    api.delete(f"{LOOKS}{look.id}/boost/")
    assert api.get(f"{LOOKS}{look.id}/").data["is_boosted"] is False


@pytest.mark.django_db
def test_cannot_boost_foreign(api, make_user):
    from apps.billing.models import Subscription
    owner = make_user(username="o", email="o@e.com")
    other = make_user(username="x", email="x@e.com")
    Subscription.objects.create(user=other, plan="pro", source="manual")
    look = _look(owner)
    api.force_authenticate(user=other)
    assert api.post(f"{LOOKS}{look.id}/boost/").status_code == 403
