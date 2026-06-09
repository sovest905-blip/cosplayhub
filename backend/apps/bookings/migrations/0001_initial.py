# Слоты аренды локаций + брони (заявка → подтверждение владельцем, без денег до ТОО).
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Slot',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(blank=True, max_length=120, verbose_name='название')),
                ('date', models.DateField(verbose_name='дата')),
                ('time_start', models.TimeField(verbose_name='начало')),
                ('time_end', models.TimeField(verbose_name='конец')),
                ('price', models.PositiveIntegerField(blank=True, null=True, verbose_name='цена ₸')),
                ('is_active', models.BooleanField(default=True, verbose_name='активен')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('owner', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='slots', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'слот аренды',
                'verbose_name_plural': 'слоты аренды',
                'ordering': ['date', 'time_start'],
            },
        ),
        migrations.CreateModel(
            name='Booking',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.CharField(choices=[('pending', 'Заявка'), ('approved', 'Подтверждена'), ('declined', 'Отклонена'), ('cancelled', 'Отменена')], default='pending', max_length=12, verbose_name='статус')),
                ('comment', models.CharField(blank=True, max_length=300, verbose_name='комментарий')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('slot', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='bookings', to='bookings.slot')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='bookings', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'бронь',
                'verbose_name_plural': 'брони',
                'ordering': ['-created_at'],
            },
        ),
    ]
