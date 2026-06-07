import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("guides", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="guide",
            name="author",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                                    related_name="guides", to=settings.AUTH_USER_MODEL),
        ),
    ]
