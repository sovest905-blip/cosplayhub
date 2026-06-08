from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("workshops", "0001_initial"),
        ("billing", "0002_migrate_workshop_pro"),  # сначала перенести данные
    ]

    operations = [
        migrations.RemoveField(
            model_name="workshop",
            name="is_pro",
        ),
    ]
