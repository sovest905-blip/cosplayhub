"""Тесты авторизации: регистрация, вход, блокировка, OTP, сброс пароля."""
import pytest
from django.core.cache import cache

from apps.profiles.models import Profile
from apps.users.models import User

REGISTER = "/api/v1/auth/register/"
LOGIN = "/api/v1/auth/login/"
ME = "/api/v1/auth/me/"
VERIFY_OTP = "/api/v1/auth/verify-otp/"
FORGOT = "/api/v1/auth/forgot-password/"
RESET = "/api/v1/auth/reset-password/"

PWD = "Cosplay2026!"


# ── Регистрация ────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_register_email_creates_user_and_fan_profile(api):
    resp = api.post(REGISTER, {"identifier": "new@example.com", "username": "newbie", "password": PWD})
    assert resp.status_code == 201
    assert resp.data["kind"] == "email"

    user = User.objects.get(email="new@example.com")
    assert user.username == "newbie"
    # Каждому новичку — дефолтная роль «фанат».
    prof = Profile.objects.get(user=user)
    assert prof.roles == ["fan"]


@pytest.mark.django_db
def test_register_sends_email_otp_to_cache(api):
    api.post(REGISTER, {"identifier": "otp@example.com", "username": "otpuser", "password": PWD})
    assert cache.get("otp:email:otp@example.com") is not None


@pytest.mark.django_db
def test_register_duplicate_email_rejected(api, make_user):
    make_user(email="dup@example.com")
    resp = api.post(REGISTER, {"identifier": "dup@example.com", "username": "other", "password": PWD})
    assert resp.status_code == 400
    assert "identifier" in resp.data


@pytest.mark.django_db
def test_register_duplicate_username_rejected(api, make_user):
    make_user(username="taken", email="a@example.com")
    resp = api.post(REGISTER, {"identifier": "b@example.com", "username": "taken", "password": PWD})
    assert resp.status_code == 400
    assert "username" in resp.data


@pytest.mark.django_db
def test_register_weak_password_rejected(api):
    resp = api.post(REGISTER, {"identifier": "weak@example.com", "username": "weak", "password": "123"})
    assert resp.status_code == 400
    assert "password" in resp.data


@pytest.mark.django_db
def test_register_garbage_identifier_rejected(api):
    resp = api.post(REGISTER, {"identifier": "not-an-email", "username": "x", "password": PWD})
    assert resp.status_code == 400


# ── Вход ───────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_login_success(api, make_user):
    make_user(username="alice", email="alice@example.com")
    resp = api.post(LOGIN, {"identifier": "alice@example.com", "password": PWD})
    assert resp.status_code == 200
    assert resp.data["username"] == "alice"


@pytest.mark.django_db
def test_login_wrong_password(api, make_user):
    make_user(email="bob@example.com")
    resp = api.post(LOGIN, {"identifier": "bob@example.com", "password": "WrongPass999!"})
    assert resp.status_code == 401


@pytest.mark.django_db
def test_login_by_phone(api, make_user):
    make_user(username="phoneuser", email=None, phone="+77011234567")
    resp = api.post(LOGIN, {"identifier": "+77011234567", "password": PWD})
    assert resp.status_code == 200
    assert resp.data["username"] == "phoneuser"


@pytest.mark.django_db
def test_blocked_user_cannot_login(api, make_user):
    """Регрессия ИБ: заблокированный (is_active=False) не должен входить."""
    make_user(email="blocked@example.com", is_active=False)
    resp = api.post(LOGIN, {"identifier": "blocked@example.com", "password": PWD})
    assert resp.status_code == 401


# ── /me ────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_me_requires_auth(api):
    assert api.get(ME).status_code == 403


@pytest.mark.django_db
def test_me_returns_current_user(api, make_user):
    user = make_user(username="self", email="self@example.com")
    api.force_authenticate(user=user)
    resp = api.get(ME)
    assert resp.status_code == 200
    assert resp.data["username"] == "self"
    assert resp.data["is_pro"] is False  # без подписки


# ── OTP подтверждение email ─────────────────────────────────────────────────────

@pytest.mark.django_db
def test_verify_email_otp_marks_verified(api):
    api.post(REGISTER, {"identifier": "verify@example.com", "username": "vu", "password": PWD})
    stored = cache.get("otp:email:verify@example.com")
    code = stored.split(":")[0]

    resp = api.post(VERIFY_OTP, {"email": "verify@example.com", "code": code})
    assert resp.status_code == 200
    assert User.objects.get(email="verify@example.com").is_email_verified is True


@pytest.mark.django_db
def test_verify_email_otp_wrong_code(api):
    api.post(REGISTER, {"identifier": "v2@example.com", "username": "v2", "password": PWD})
    resp = api.post(VERIFY_OTP, {"email": "v2@example.com", "code": "000000"})
    assert resp.status_code == 400


# ── Сброс пароля ────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_password_reset_flow(api, make_user):
    make_user(email="reset@example.com")
    # 1. Запрос кода
    assert api.post(FORGOT, {"identifier": "reset@example.com"}).status_code == 200
    code = cache.get("otp:reset:reset@example.com").split(":")[0]
    # 2. Сброс на новый пароль
    new_pwd = "BrandNew2027!"
    resp = api.post(RESET, {"email": "reset@example.com", "code": code, "new_password": new_pwd})
    assert resp.status_code == 200
    # 3. Старый пароль больше не работает, новый — работает
    assert api.post(LOGIN, {"identifier": "reset@example.com", "password": PWD}).status_code == 401
    assert api.post(LOGIN, {"identifier": "reset@example.com", "password": new_pwd}).status_code == 200


@pytest.mark.django_db
def test_forgot_password_unknown_email_no_leak(api):
    """Перечисление юзеров закрыто: ответ для несуществующего email такой же (200)."""
    resp = api.post(FORGOT, {"identifier": "ghost@example.com"})
    assert resp.status_code == 200
