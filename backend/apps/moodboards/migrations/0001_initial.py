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
            name="Moodboard",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=160, verbose_name="название")),
                ("description", models.TextField(blank=True, verbose_name="описание")),
                ("cover", models.ImageField(blank=True, null=True, upload_to="moodboards/", verbose_name="обложка")),
                ("is_public", models.BooleanField(default=True, verbose_name="публичная")),
                ("is_active", models.BooleanField(default=True, verbose_name="активна")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("owner", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                                            related_name="moodboards", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="MoodboardItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("image", models.ImageField(blank=True, null=True, upload_to="moodboards/items/", verbose_name="картинка")),
                ("image_url", models.URLField(blank=True, verbose_name="ссылка на картинку")),
                ("caption", models.CharField(blank=True, max_length=200, verbose_name="подпись")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("board", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="items", to="moodboards.moodboard")),
            ],
            options={"ordering": ["id"]},
        ),
    ]
