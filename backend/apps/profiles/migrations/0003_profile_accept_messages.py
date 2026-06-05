from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("profiles", "0002_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="profile",
            name="accept_messages",
            field=models.BooleanField(default=True, verbose_name="принимаю сообщения"),
        ),
    ]
