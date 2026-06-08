import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("workshops", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Subscription",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("plan", models.CharField(choices=[("pro", "Pro профиля"), ("workshop", "Тариф мастерской")], max_length=20, verbose_name="тариф")),
                ("source", models.CharField(choices=[("trial", "Триал"), ("manual", "Вручную"), ("payment", "Оплата")], default="trial", max_length=20, verbose_name="источник")),
                ("active_until", models.DateTimeField(blank=True, help_text="Пусто = бессрочно", null=True, verbose_name="активна до")),
                ("disabled", models.BooleanField(default=False, help_text="Принудительно выключить, не удаляя историю", verbose_name="отключена")),
                ("note", models.CharField(blank=True, max_length=200, verbose_name="заметка")),
                ("started_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="subscriptions", to=settings.AUTH_USER_MODEL)),
                ("workshop", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="subscriptions", to="workshops.workshop")),
            ],
            options={
                "verbose_name": "подписка",
                "verbose_name_plural": "подписки",
                "ordering": ["-started_at"],
            },
        ),
        migrations.AddConstraint(
            model_name="subscription",
            constraint=models.UniqueConstraint(condition=models.Q(("workshop__isnull", True), ("plan", "pro")), fields=("user",), name="uniq_user_pro"),
        ),
        migrations.AddConstraint(
            model_name="subscription",
            constraint=models.UniqueConstraint(condition=models.Q(("workshop__isnull", False)), fields=("workshop",), name="uniq_workshop_sub"),
        ),
    ]
