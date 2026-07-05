from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="DailyVisit",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("date", models.DateField(unique=True, verbose_name="дата")),
                ("count", models.PositiveIntegerField(default=0, verbose_name="посещений")),
            ],
            options={
                "verbose_name": "посещения за день",
                "verbose_name_plural": "посещения по дням",
                "ordering": ["-date"],
            },
        ),
    ]
