from django.conf import settings
from django.db import models


class Team(models.Model):
    """Косплей-команда: совместные образы, конвенты, съёмки."""
    captain = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                null=True, blank=True, related_name="teams_captained")
    name = models.CharField("название", max_length=120)
    city = models.CharField("город", max_length=80, blank=True)
    about = models.TextField("описание", blank=True)
    avatar = models.ImageField("лого", upload_to="teams/", blank=True, null=True)
    cover = models.ImageField("обложка", upload_to="teams/", blank=True, null=True)
    is_open = models.BooleanField("открытый набор", default=True)   # вступление без заявки
    is_active = models.BooleanField("активна", default=True)         # модерация (скрыть)
    instagram = models.CharField("instagram", max_length=120, blank=True)
    tiktok = models.CharField("tiktok", max_length=120, blank=True)
    contact = models.CharField("контакт", max_length=160, blank=True)
    events = models.ManyToManyField("events.Event", related_name="teams", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class TeamMember(models.Model):
    """Участник команды. status: member (в составе) / pending (заявка)."""
    STATUS = [("member", "Участник"), ("pending", "Заявка")]
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="members")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="team_memberships")
    role_in_team = models.CharField("роль в команде", max_length=60, default="Участник", blank=True)
    status = models.CharField(max_length=10, choices=STATUS, default="member")
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("team", "user")
        ordering = ["joined_at"]


class TeamLike(models.Model):
    """Лайк/подписка на команду."""
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="likes")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="team_likes")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("team", "user")
