from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_user_telegram_id'),
    ]

    operations = [
        # email: unique + nullable (уже nullable из 0002, добавляем db_index)
        migrations.AlterField(
            model_name='user',
            name='email',
            field=models.EmailField(
                blank=True, null=True, unique=True, verbose_name='email'
            ),
        ),
        # phone: добавляем db_index
        migrations.AlterField(
            model_name='user',
            name='phone',
            field=models.CharField(
                blank=True, db_index=True, max_length=20, verbose_name='телефон'
            ),
        ),
        # Новые поля подтверждения
        migrations.AddField(
            model_name='user',
            name='is_email_verified',
            field=models.BooleanField(default=False, verbose_name='email подтверждён'),
        ),
        migrations.AddField(
            model_name='user',
            name='is_phone_verified',
            field=models.BooleanField(default=False, verbose_name='телефон подтверждён'),
        ),
        # Мигрируем is_verified → is_email_verified для существующих верифицированных
        migrations.RunSQL(
            sql="UPDATE users_user SET is_email_verified = TRUE WHERE is_verified = TRUE AND email IS NOT NULL;",
            reverse_sql="",
        ),
    ]
