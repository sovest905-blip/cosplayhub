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
    experience = models.CharField("опыт", max_length=60, blank=True)
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
