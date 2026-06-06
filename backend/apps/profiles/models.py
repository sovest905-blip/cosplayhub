from django.conf import settings
from django.db import models

class Profile(models.Model):
    """Профиль косплеера/фотографа. Один-к-одному с User."""
    ROLE_CHOICES = [
        ("cosplayer", "Косплеер"), ("photographer", "Фотограф"),
        ("workshop", "Мастерская"), ("shop", "Магазин"),
        ("location", "Локация"), ("fan", "Фанат"),
    ]
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                                related_name="profile")
    display_name = models.CharField("ник", max_length=80)
    bio = models.TextField("о себе", blank=True)
    roles = models.JSONField("роли", default=list)        # ["cosplayer","fan"]
    avatar = models.ImageField("аватар", upload_to="avatars/", blank=True, null=True)
    cover = models.ImageField("обложка", upload_to="covers/", blank=True, null=True)
    available_for_work = models.BooleanField("свободен для заказов", default=False)
    accept_messages = models.BooleanField("принимаю сообщения", default=True)
    experience = models.CharField("опыт", max_length=60, blank=True)
    role_details = models.JSONField("анкеты ролей", default=dict, blank=True)  # {role: {...поля}}
    rating = models.DecimalField(max_digits=2, decimal_places=1, default=0)
    accent_color = models.CharField(max_length=7, default="#ff2d6f")  # конструктор
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.display_name

class SocialLink(models.Model):
    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="socials")
    platform = models.CharField(max_length=20)   # instagram, tiktok, vk...
    handle = models.CharField(max_length=120)
    is_connected = models.BooleanField(default=False)


class Follow(models.Model):
    """Подписка: follower подписан на target (оба — User)."""
    follower = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                                 related_name="following_set")
    target = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                               related_name="follower_set")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("follower", "target")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.follower_id} → {self.target_id}"
