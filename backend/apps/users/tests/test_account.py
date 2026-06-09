"""Тесты настроек аккаунта: смена пароля + самоудаление."""
import pytest

from apps.users.models import User

CHANGE = "/api/v1/auth/change-password/"
DELETE = "/api/v1/auth/delete-account/"
LOGIN = "/api/v1/auth/login/"
ME = "/api/v1/auth/me/"

PWD = "Cosplay2026!"
NEW = "BrandNew2027!"


# ── Смена пароля ────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_change_password_requires_auth(api):
    assert api.post(CHANGE, {"current_password": PWD, "new_password": NEW}).status_code == 403


@pytest.mark.django_db
def test_change_password_success(api, make_user):
    user = make_user(email="u@example.com")
    api.force_authenticate(user=user)
    resp = api.post(CHANGE, {"current_password": PWD, "new_password": NEW})
    assert resp.status_code == 200
    user.refresh_from_db()
    assert user.check_password(NEW)
    # старый пароль больше не работает, новый — да
    fresh = api  # новый клиент не нужен: проверим логином
    assert fresh.post(LOGIN, {"identifier": "u@example.com", "password": PWD}).status_code == 401
    assert fresh.post(LOGIN, {"identifier": "u@example.com", "password": NEW}).status_code == 200


@pytest.mark.django_db
def test_change_password_wrong_current(api, make_user):
    user = make_user()
    api.force_authenticate(user=user)
    resp = api.post(CHANGE, {"current_password": "WrongNow999!", "new_password": NEW})
    assert resp.status_code == 400
    user.refresh_from_db()
    assert user.check_password(PWD)  # не сменился


@pytest.mark.django_db
def test_change_password_weak_rejected(api, make_user):
    user = make_user()
    api.force_authenticate(user=user)
    assert api.post(CHANGE, {"current_password": PWD, "new_password": "123"}).status_code == 400


# ── Удаление аккаунта ───────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_delete_account_requires_auth(api):
    assert api.post(DELETE, {"password": PWD}).status_code == 403


@pytest.mark.django_db
def test_delete_account_success(api, make_user):
    user = make_user(email="bye@example.com")
    uid = user.id
    api.force_authenticate(user=user)
    resp = api.post(DELETE, {"password": PWD})
    assert resp.status_code == 204
    assert not User.objects.filter(pk=uid).exists()


@pytest.mark.django_db
def test_delete_account_wrong_password(api, make_user):
    user = make_user()
    api.force_authenticate(user=user)
    resp = api.post(DELETE, {"password": "Nope12345!"})
    assert resp.status_code == 400
    assert User.objects.filter(pk=user.id).exists()
