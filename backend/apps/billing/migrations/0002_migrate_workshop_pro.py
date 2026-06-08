from django.db import migrations


def forward(apps, schema_editor):
    """Существующие мастерские с is_pro=True → бессрочная подписка (source=manual)."""
    Workshop = apps.get_model("workshops", "Workshop")
    Subscription = apps.get_model("billing", "Subscription")
    for w in Workshop.objects.filter(is_pro=True):
        Subscription.objects.get_or_create(
            workshop=w,
            defaults={
                "user_id": w.owner_id,
                "plan": "workshop",
                "source": "manual",
                "active_until": None,  # бессрочно — как было раньше
                "note": "перенос is_pro при миграции",
            },
        )


def backward(apps, schema_editor):
    Workshop = apps.get_model("workshops", "Workshop")
    Subscription = apps.get_model("billing", "Subscription")
    for sub in Subscription.objects.filter(plan="workshop", workshop__isnull=False):
        Workshop.objects.filter(pk=sub.workshop_id).update(is_pro=True)


class Migration(migrations.Migration):

    dependencies = [
        ("billing", "0001_initial"),
        ("workshops", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(forward, backward),
    ]
