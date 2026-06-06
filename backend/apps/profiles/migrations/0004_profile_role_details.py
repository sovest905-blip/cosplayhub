from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("profiles", "0003_profile_accept_messages"),
    ]

    operations = [
        migrations.AddField(
            model_name="profile",
            name="role_details",
            field=models.JSONField(blank=True, default=dict, verbose_name="анкеты ролей"),
        ),
    ]
