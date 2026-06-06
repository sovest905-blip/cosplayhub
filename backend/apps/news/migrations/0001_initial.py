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
            name="News",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=200, verbose_name="заголовок")),
                ("body", models.TextField(blank=True, verbose_name="текст")),
                ("image", models.ImageField(blank=True, null=True, upload_to="news/", verbose_name="картинка")),
                ("is_pinned", models.BooleanField(default=False, verbose_name="закреплено")),
                ("is_published", models.BooleanField(default=True, verbose_name="опубликовано")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("author", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                                             related_name="news", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "verbose_name": "новость",
                "verbose_name_plural": "новости",
                "ordering": ["-is_pinned", "-created_at"],
            },
        ),
    ]
