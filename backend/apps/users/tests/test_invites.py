"""Тесты инвайтов закрытой беты: регистрация по коду + админ-управление."""
import pytest
from django.test import override_settings

from apps.users.models import Invite, User

REGISTER = "/api/v1/auth/register/"
CHECK = "/api/v1/auth/invite-check/"
AP_INVITES = "/api/v1/admin-panel/invites/"

PWD = "Cosplay2026!"


def _reg(api, code=None, email="inv@example.com", username="invited"):
    data = {"identifier": email, "username": username, "password": PWD}
    if code is not None:
        data["invite"] = code
    return api.post(REGISTER, data)


# ── Регистрация по инвайту ──────────────────────────────────────────────────────

@pytest.mark.django_db
def test_register_without_invite_ok_when_flag_off(api):
    """INVITE_REQUIRED выключен (dev/тесты) — регистрация свободная."""
    assert _reg(api).status_code == 201


@override_settings(INVITE_REQUIRED=True)
@pytest.mark.django_db
def test_register_without_invite_rejected_when_flag_on(api):
    resp = _reg(api)
    assert resp.status_code == 400
    assert "invite" in resp.data


@override_settings(INVITE_REQUIRED=True)
@pytest.mark.django_db
def test_register_with_valid_invite(api):
    inv = Invite.objects.create(note="друг")
    resp = _reg(api, code=inv.code)
    assert resp.status_code == 201
    inv.refresh_from_db()
    assert inv.used_count == 1
    assert User.objects.get(email="inv@example.com").invite == inv


@pytest.mark.django_db
def test_register_with_wrong_code_rejected_even_when_flag_off(api):
    """Явно введённый неверный код — отказ (а не молчаливое игнорирование)."""
    resp = _reg(api, code="NOSUCHCODE")
    assert resp.status_code == 400
    assert "invite" in resp.data


@override_settings(INVITE_REQUIRED=True)
@pytest.mark.django_db
def test_exhausted_invite_rejected(api):
    inv = Invite.objects.create(max_uses=1, used_count=1)
    assert _reg(api, code=inv.code).status_code == 400


@override_settings(INVITE_REQUIRED=True)
@pytest.mark.django_db
def test_disabled_invite_rejected(api):
    inv = Invite.objects.create(is_active=False)
    assert _reg(api, code=inv.code).status_code == 400


@override_settings(INVITE_REQUIRED=True)
@pytest.mark.django_db
def test_invite_code_case_insensitive(api):
    inv = Invite.objects.create()
    assert _reg(api, code=inv.code.lower()).status_code == 201


@override_settings(INVITE_REQUIRED=True)
@pytest.mark.django_db
def test_unlimited_invite(api):
    inv = Invite.objects.create(max_uses=0, used_count=99)
    assert _reg(api, code=inv.code).status_code == 201


# ── invite-check (форма регистрации) ───────────────────────────────────────────

@pytest.mark.django_db
def test_invite_check_reports_flag(api):
    assert api.get(CHECK).data == {"required": False}
    with override_settings(INVITE_REQUIRED=True):
        assert api.get(CHECK).data == {"required": True}


@pytest.mark.django_db
def test_invite_check_validates_code(api):
    inv = Invite.objects.create()
    assert api.get(CHECK, {"code": inv.code}).data["valid"] is True
    assert api.get(CHECK, {"code": "WRONG"}).data["valid"] is False


# ── Админ-панель ────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_admin_invites_staff_only(api, make_user):
    assert api.get(AP_INVITES).status_code == 403
    api.force_authenticate(user=make_user())
    assert api.get(AP_INVITES).status_code == 403


@pytest.mark.django_db
def test_admin_create_and_list_invites(api, make_user):
    api.force_authenticate(user=make_user(is_staff=True))
    resp = api.post(AP_INVITES, {"note": "для чата косплееров", "max_uses": 50})
    assert resp.status_code == 201
    assert resp.data["max_uses"] == 50
    assert len(resp.data["code"]) == 10

    listing = api.get(AP_INVITES)
    assert listing.status_code == 200
    assert listing.data[0]["note"] == "для чата косплееров"


@pytest.mark.django_db
def test_admin_toggle_and_delete_invite(api, make_user):
    api.force_authenticate(user=make_user(is_staff=True))
    inv = Invite.objects.create()

    # format="json": form-encoding превратила бы False в строку "False" (truthy)
    resp = api.post(f"{AP_INVITES}{inv.id}/", {"is_active": False}, format="json")
    assert resp.status_code == 200
    assert resp.data["is_active"] is False

    assert api.delete(f"{AP_INVITES}{inv.id}/").status_code == 204
    assert not Invite.objects.filter(pk=inv.id).exists()


@pytest.mark.django_db
def test_admin_invite_lists_registered_users(api, make_user):
    inv = Invite.objects.create()
    with override_settings(INVITE_REQUIRED=True):
        _reg(api, code=inv.code, username="beta_user")
    api.force_authenticate(user=make_user(is_staff=True))
    data = api.get(AP_INVITES).data
    assert "beta_user" in data[0]["users"]
