"""Стартовый набор маскотов (6 шт) в библиотеку — из статических /mascots/*.png.
Идемпотентно: get_or_create по slug. Так у тех, кто уже выбрал маскота, ничего не слетит."""
from django.db import migrations

MASCOTS = [
    ("chameleon", "Хамелеон"),
    ("kitsune", "Кицунэ"),
    ("robot", "Робот"),
    ("octopus", "Осьминог"),
    ("owl", "Сова"),
    ("slime", "Слизень"),
]


def seed(apps, schema_editor):
    Mascot = apps.get_model("profiles", "Mascot")
    for i, (slug, name) in enumerate(MASCOTS):
        Mascot.objects.get_or_create(
            slug=slug,
            defaults={"name": name, "image_url": f"/mascots/{slug}.png", "is_active": True, "order": i},
        )


def unseed(apps, schema_editor):
    Mascot = apps.get_model("profiles", "Mascot")
    Mascot.objects.filter(slug__in=[s for s, _ in MASCOTS]).delete()


class Migration(migrations.Migration):
    dependencies = [("profiles", "0013_mascot")]
    operations = [migrations.RunPython(seed, unseed)]
