import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Listing",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("title", models.CharField(max_length=120, verbose_name="заголовок")),
                ("description", models.TextField(blank=True, verbose_name="описание")),
                ("type", models.CharField(choices=[("job", "Ищу специалиста"), ("collab", "Коллаборация"), ("sell", "Продаю"), ("buy", "Куплю")], max_length=20, verbose_name="тип")),
                ("city", models.CharField(blank=True, max_length=80, verbose_name="город")),
                ("price", models.PositiveIntegerField(blank=True, null=True, verbose_name="цена ₸")),
                ("is_active", models.BooleanField(default=True, verbose_name="активно")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="listings", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
