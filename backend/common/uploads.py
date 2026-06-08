"""Безопасная проверка загружаемых изображений.

Зачем: эндпоинты, которые сохраняют файл напрямую (avatar/cover/галерея),
раньше проверяли только `content_type` — а его шлёт клиент и легко подделать.
Можно было залить evil.svg с заголовком image/png → файл отдаётся из /media/
с расширением .svg → браузер исполняет скрипт внутри SVG (stored XSS).

Тут файл реально открывается через Pillow (растровый рисунок или нет),
а имя при сохранении принудительно получает расширение по ОПРЕДЕЛЁННОМУ формату,
поэтому .svg/.html/.js-имена обезвреживаются.
"""
from PIL import Image
from rest_framework import serializers

# Формат Pillow → безопасное расширение. SVG здесь нет намеренно
# (Pillow его и не открывает как растр) — значит svg/любой не-растр отклоняется.
ALLOWED_FORMATS = {
    "JPEG": "jpg",
    "PNG": "png",
    "WEBP": "webp",
    "GIF": "gif",
}

MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 МБ


def validate_image(file, *, max_size: int = MAX_IMAGE_SIZE) -> str:
    """Проверяет, что file — настоящее растровое изображение допустимого формата.

    Возвращает безопасное расширение (без точки). Кидает DRF ValidationError,
    если файл не картинка / неподдерживаемый формат / превышен размер.
    """
    if file.size > max_size:
        raise serializers.ValidationError(
            f"Максимальный размер — {max_size // (1024 * 1024)} МБ"
        )
    try:
        file.seek(0)
        img = Image.open(file)
        img.verify()  # проверяет целостность, не декодируя полностью
        fmt = img.format
    except Exception:
        raise serializers.ValidationError(
            "Загрузите корректное изображение (jpg, png, webp, gif)"
        )
    finally:
        file.seek(0)

    if fmt not in ALLOWED_FORMATS:
        raise serializers.ValidationError(
            "Недопустимый формат. Разрешены: jpg, png, webp, gif"
        )
    return ALLOWED_FORMATS[fmt]


def safe_image_name(stem: str, ext: str) -> str:
    """Безопасное имя файла: только латиница/цифры/-/_ из stem + проверенное расширение."""
    import re
    base = re.sub(r"[^a-zA-Z0-9_-]", "", (stem or "img").rsplit(".", 1)[0])[:40] or "img"
    return f"{base}.{ext}"
