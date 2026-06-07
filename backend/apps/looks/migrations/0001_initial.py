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
            name="Look",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=200, verbose_name="название")),
                ("character", models.CharField(blank=True, max_length=160, verbose_name="персонаж / фандом")),
                ("description", models.TextField(blank=True, verbose_name="описание")),
                ("image", models.ImageField(blank=True, null=True, upload_to="looks/", verbose_name="фото")),
                ("is_published", models.BooleanField(default=True, verbose_name="опубликовано")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("author", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                                             related_name="looks", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "verbose_name": "образ",
                "verbose_name_plural": "образы",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="LookLike",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("look", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="likes", to="looks.look")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="look_likes", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "unique_together": {("user", "look")},
            },
        ),
    ]
