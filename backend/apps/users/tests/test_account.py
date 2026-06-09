"""Тесты настроек аккаунта: смена пароля, смена email, самоудаление."""
import pytest
from django.core.cache import cache

from apps.users.models import User

CHANGE = "/api/v1/auth/change-password/"
DELETE = "/api/v1/auth/delete-account/"
EMAIL_REQ = "/api/v1/auth/change-email/"
EMAIL_CONFIRM = "/api/v1/auth/change-email/confirm/"
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


# ── Смена email ─────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_change_email_requires_auth(api):
    assert api.post(EMAIL_REQ, {"new_email": "new@example.com"}).status_code == 403


@pytest.mark.django_db
def test_change_email_flow(api, make_user):
    user = make_user(email="old@example.com")
    api.force_authenticate(user=user)
    # 1. Запрос кода на новый адрес
    assert api.post(EMAIL_REQ, {"new_email": "new@example.com"}).status_code == 200
    stored = cache.get(f"otp:emailchange:{user.id}")
    assert stored is not None
    code = stored.split(":", 2)[0]
    # 2. Подтверждение
    resp = api.post(EMAIL_CONFIRM, {"code": code})
    assert resp.status_code == 200
    assert resp.data["email"] == "new@example.com"
    user.refresh_from_db()
    assert user.email == "new@example.com"
    assert user.is_email_verified is True


@pytest.mark.django_db
def test_change_email_rejects_taken(api, make_user):
    make_user(email="taken@example.com")
    user = make_user(email="me@example.com")
    api.force_authenticate(user=user)
    assert api.post(EMAIL_REQ, {"new_email": "taken@example.com"}).status_code == 400


@pytest.mark.django_db
def test_change_email_rejects_invalid(api, make_user):
    user = make_user()
    api.force_authenticate(user=user)
    assert api.post(EMAIL_REQ, {"new_email": "notanemail"}).status_code == 400


@pytest.mark.django_db
def test_change_email_wrong_code(api, make_user):
    user = make_user(email="me@example.com")
    api.force_authenticate(user=user)
    api.post(EMAIL_REQ, {"new_email": "new@example.com"})
    resp = api.post(EMAIL_CONFIRM, {"code": "000000"})
    assert resp.status_code == 400
    user.refresh_from_db()
    assert user.email == "me@example.com"  # не сменился
