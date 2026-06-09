from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("moodboards", "0002_moodboarditem_price"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="moodboarditem",
            name="price",
        ),
    ]
