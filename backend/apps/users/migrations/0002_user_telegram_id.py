from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='telegram_id',
            field=models.CharField(blank=True, db_index=True, max_length=32, verbose_name='telegram chat_id'),
        ),
    ]
