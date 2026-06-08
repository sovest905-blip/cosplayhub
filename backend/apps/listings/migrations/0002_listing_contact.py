from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("listings", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="listing",
            name="contact",
            field=models.CharField(
                blank=True,
                help_text="Telegram, телефон, почта и т.п. Показывается в объявлении.",
                max_length=200,
                verbose_name="контакты для связи",
            ),
        ),
    ]
