from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("moodboards", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="moodboarditem",
            name="price",
            field=models.CharField(blank=True, max_length=40, verbose_name="цена"),
        ),
    ]
