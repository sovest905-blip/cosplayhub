from django.db import migrations, models


def sync_status(apps, schema_editor):
    """Существующие гайды приводим к новому полю status по is_published."""
    Guide = apps.get_model("guides", "Guide")
    Guide.objects.filter(is_published=True).update(status="published")
    Guide.objects.filter(is_published=False).update(status="pending")


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("guides", "0003_guidephoto"),
    ]

    operations = [
        migrations.AddField(
            model_name="guide",
            name="status",
            field=models.CharField(
                choices=[("pending", "На модерации"), ("published", "Опубликован"), ("rejected", "Отклонён")],
                default="published", max_length=12, verbose_name="статус модерации",
            ),
        ),
        migrations.AddField(
            model_name="guide",
            name="moderation_note",
            field=models.CharField(blank=True, max_length=300, verbose_name="причина отклонения"),
        ),
        migrations.RunPython(sync_status, noop),
    ]
