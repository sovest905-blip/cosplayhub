"""Заводим первого партнёра — ART.KZ (генеральный, полоса + карточка в ленте).
Идемпотентно: get_or_create по имени. Логотип загрузит Николай через админку."""
from django.db import migrations


def seed_artkz(apps, schema_editor):
    Partner = apps.get_model("partners", "Partner")
    Partner.objects.get_or_create(
        name="ART.KZ",
        defaults={
            "url": "https://art.kz",
            "tier": "general",
            "card_text": "Продавай косплей на ART.KZ",
            "show_strip": True,
            "show_feed": True,
            "is_active": True,
            "order": 0,
        },
    )


def unseed(apps, schema_editor):
    Partner = apps.get_model("partners", "Partner")
    Partner.objects.filter(name="ART.KZ").delete()


class Migration(migrations.Migration):
    dependencies = [("partners", "0001_initial")]
    operations = [migrations.RunPython(seed_artkz, unseed)]
