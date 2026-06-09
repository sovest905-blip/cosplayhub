# Синхронизация состояния миграций с моделью (verbose_name='ID' у авто-pk).
# Изменений схемы в БД нет — AlterField на BigAutoField это no-op на Postgres.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('messaging', '0002_conversation_listing'),
    ]

    operations = [
        migrations.AlterField(
            model_name='conversation',
            name='id',
            field=models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID'),
        ),
        migrations.AlterField(
            model_name='message',
            name='id',
            field=models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID'),
        ),
    ]
