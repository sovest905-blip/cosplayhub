from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Event",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=200, verbose_name="название")),
                ("description", models.TextField(blank=True, verbose_name="описание")),
                ("city", models.CharField(blank=True, max_length=80, verbose_name="город")),
                ("place", models.CharField(blank=True, max_length=200, verbose_name="место")),
                ("date", models.DateField(verbose_name="дата")),
                ("cover", models.ImageField(blank=True, null=True, upload_to="events/", verbose_name="обложка")),
                ("going", models.PositiveIntegerField(default=0, verbose_name="идут")),
                ("is_published", models.BooleanField(default=True, verbose_name="опубликовано")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "verbose_name": "событие",
                "verbose_name_plural": "события",
                "ordering": ["date"],
            },
        ),
    ]
