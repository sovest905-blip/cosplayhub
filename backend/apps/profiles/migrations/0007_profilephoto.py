import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("profiles", "0006_favorite"),
    ]

    operations = [
        migrations.CreateModel(
            name="ProfilePhoto",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("image", models.ImageField(upload_to="gallery/")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("profile", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,
                                              related_name="photos", to="profiles.profile")),
            ],
            options={
                "ordering": ["id"],
            },
        ),
    ]
