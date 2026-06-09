# Инвайты для закрытой беты: модель Invite + User.invite (кто по какому коду пришёл).
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models

import apps.users.models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0004_alter_user_is_verified_alter_user_telegram_id'),
    ]

    operations = [
        migrations.CreateModel(
            name='Invite',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code', models.CharField(default=apps.users.models._invite_code, max_length=20, unique=True, verbose_name='код')),
                ('note', models.CharField(blank=True, max_length=120, verbose_name='заметка (для кого)')),
                ('max_uses', models.PositiveIntegerField(default=1, verbose_name='лимит использований (0 = безлимит)')),
                ('used_count', models.PositiveIntegerField(default=0, verbose_name='использован раз')),
                ('is_active', models.BooleanField(default=True, verbose_name='активен')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='invites_created', to=settings.AUTH_USER_MODEL, verbose_name='создал')),
            ],
            options={
                'verbose_name': 'инвайт',
                'verbose_name_plural': 'инвайты',
            },
        ),
        migrations.AddField(
            model_name='user',
            name='invite',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='users', to='users.invite', verbose_name='пришёл по инвайту'),
        ),
    ]
