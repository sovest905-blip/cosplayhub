from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Guide",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=200, verbose_name="заголовок")),
                ("summary", models.CharField(blank=True, max_length=300, verbose_name="кратко")),
                ("body", models.TextField(blank=True, verbose_name="текст")),
                ("category", models.CharField(blank=True, max_length=40, verbose_name="категория")),
                ("cover", models.ImageField(blank=True, null=True, upload_to="guides/", verbose_name="обложка")),
                ("is_published", models.BooleanField(default=True, verbose_name="опубликовано")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "verbose_name": "гайд",
                "verbose_name_plural": "гайды",
                "ordering": ["-created_at"],
            },
        ),
    ]
