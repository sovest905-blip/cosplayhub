"""Общие фикстуры для всех тестов."""
import pytest
from rest_framework.test import APIClient

from apps.users.models import User
from apps.workshops.models import Workshop


@pytest.fixture
def api():
    """Чистый API-клиент (без аутентификации)."""
    return APIClient()


@pytest.fixture
def make_user(db):
    """Фабрика пользователей. По умолчанию — email-аккаунт с валидным паролем."""
    counter = {"n": 0}

    def _make(username=None, password="Cosplay2026!", **kw):
        counter["n"] += 1
        n = counter["n"]
        username = username or f"user{n}"
        kw.setdefault("email", f"user{n}@example.com")
        u = User(username=username, **kw)
        u.set_password(password)
        u.save()
        return u

    return _make


@pytest.fixture
def make_workshop(db):
    """Фабрика мастерских (нужен владелец)."""
    def _make(owner, name="Мастерская", type="eva", city="Алматы", **kw):
        return Workshop.objects.create(owner=owner, name=name, type=type, city=city, **kw)

    return _make
