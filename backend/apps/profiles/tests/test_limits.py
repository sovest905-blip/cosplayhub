"""Тесты Pro-лимитов галереи (×PRO_LIMIT_MULTIPLIER). Чистые функции, без БД."""
from apps.billing.models import PRO_LIMIT_MULTIPLIER
from apps.profiles.models import GALLERY_LIMITS, gallery_limit


def test_gallery_limit_base_non_pro():
    assert gallery_limit(["location"]) == GALLERY_LIMITS["location"]
    assert gallery_limit(["photographer"]) == GALLERY_LIMITS["photographer"]
    assert gallery_limit(["cosplayer"]) == GALLERY_LIMITS["cosplayer"]


def test_gallery_limit_takes_max_role():
    assert gallery_limit(["cosplayer", "location"]) == GALLERY_LIMITS["location"]


def test_gallery_limit_pro_multiplies():
    assert gallery_limit(["location"], is_pro=True) == GALLERY_LIMITS["location"] * PRO_LIMIT_MULTIPLIER
    assert gallery_limit(["cosplayer"], is_pro=True) == GALLERY_LIMITS["cosplayer"] * PRO_LIMIT_MULTIPLIER


def test_gallery_limit_zero_stays_zero_even_for_pro():
    # Роль без галереи (напр. fan) → 0, Pro не делает 0×4 положительным.
    assert gallery_limit(["fan"]) == 0
    assert gallery_limit(["fan"], is_pro=True) == 0
    assert gallery_limit([], is_pro=True) == 0
