# Синхронизация состояния миграций с моделью (verbose_name='ID' у авто-pk).
# Изменений схемы в БД нет — AlterField на BigAutoField это no-op на Postgres.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='notification',
            name='id',
            field=models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID'),
        ),
    ]
