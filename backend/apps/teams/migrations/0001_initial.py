import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("events", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Team",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=120, verbose_name="название")),
                ("city", models.CharField(blank=True, max_length=80, verbose_name="город")),
                ("about", models.TextField(blank=True, verbose_name="описание")),
                ("avatar", models.ImageField(blank=True, null=True, upload_to="teams/", verbose_name="лого")),
                ("cover", models.ImageField(blank=True, null=True, upload_to="teams/", verbose_name="обложка")),
                ("is_open", models.BooleanField(default=True, verbose_name="открытый набор")),
                ("is_active", models.BooleanField(default=True, verbose_name="активна")),
                ("instagram", models.CharField(blank=True, max_length=120, verbose_name="instagram")),
                ("tiktok", models.CharField(blank=True, max_length=120, verbose_name="tiktok")),
                ("contact", models.CharField(blank=True, max_length=160, verbose_name="контакт")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("captain", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                                              related_name="teams_captained", to=settings.AUTH_USER_MODEL)),
                ("events", models.ManyToManyField(blank=True, related_name="teams", to="events.event")),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="TeamMember",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("role_in_team", models.CharField(blank=True, default="Участник", max_length=60, verbose_name="роль в команде")),
                ("status", models.CharField(choices=[("member", "Участник"), ("pending", "Заявка")], default="member", max_length=10)),
                ("joined_at", models.DateTimeField(auto_now_add=True)),
                ("team", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="members", to="teams.team")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="team_memberships", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["joined_at"], "unique_together": {("team", "user")}},
        ),
        migrations.CreateModel(
            name="TeamLike",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("team", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="likes", to="teams.team")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="team_likes", to=settings.AUTH_USER_MODEL)),
            ],
            options={"unique_together": {("team", "user")}},
        ),
    ]
