# Синхронизация состояния миграций с моделью:
#  - verbose_name='ID' у авто-pk (no-op на уровне БД);
#  - условие constraint uniq_user_pro приводится к нормализованному Django порядку
#    (plan, workshop__isnull). Индекс пересоздаётся идентичным — partial unique
#    на тех же полях и с тем же условием, данные не затрагиваются.

from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('billing', '0002_migrate_workshop_pro'),
        ('workshops', '0002_remove_workshop_is_pro'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name='subscription',
            name='uniq_user_pro',
        ),
        migrations.AlterField(
            model_name='subscription',
            name='id',
            field=models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID'),
        ),
        migrations.AddConstraint(
            model_name='subscription',
            constraint=models.UniqueConstraint(condition=models.Q(('plan', 'pro'), ('workshop__isnull', True)), fields=('user',), name='uniq_user_pro'),
        ),
    ]
