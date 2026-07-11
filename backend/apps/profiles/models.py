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
    # Pro-кастомизация (1.4): свой URL /u/<slug>, закреплённые образы. hide_from_catalog (1.6).
    slug = models.SlugField("ссылка /u/", max_length=40, unique=True, null=True, blank=True)
    pinned_look_ids = models.JSONField("закреплённые образы", default=list, blank=True)
    hide_from_catalog = models.BooleanField("скрыт из каталога", default=False)
    # Крипто-донаты P2P (Pro): список {kind, address}. Платформа НЕ хранит средства —
    # перевод напрямую косплееру (см. donations в ProfileSerializer, гейт за Pro).
    donation_methods = models.JSONField("приём донатов", default=list, blank=True)
    mascot = models.CharField("маскот-компаньон (Pro)", max_length=20, blank=True, default="")  # уголок-стикер на карточке
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.display_name

class RoleMedia(models.Model):
    """Отдельные логотип и обложка под конкретную роль профиля.

    Показываются на /people/<id>?role=<role> и в каталоге этой роли.
    Если не заданы — фолбэк на общий avatar/cover профиля."""
    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="role_media")
    role = models.CharField("роль", max_length=20)
    logo = models.ImageField("логотип роли", upload_to="role_media/logos/", blank=True, null=True)
    cover = models.ImageField("обложка роли", upload_to="role_media/covers/", blank=True, null=True)

    class Meta:
        unique_together = ("profile", "role")
        verbose_name = "медиа роли"
        verbose_name_plural = "медиа ролей"

    def __str__(self):
        return f"{self.profile_id}:{self.role}"


class SocialLink(models.Model):
    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="socials")
    platform = models.CharField(max_length=20)   # instagram, tiktok, vk...
    handle = models.CharField(max_length=120)
    is_connected = models.BooleanField(default=False)


# Лимит фото в галерее по ролям. Берём максимум среди ролей профиля.
GALLERY_LIMITS = {"location": 20, "photographer": 15, "cosplayer": 15}


def gallery_limit(roles, is_pro: bool = False) -> int:
    """Лимит фото галереи = max по ролям; Pro поднимает его в PRO_LIMIT_MULTIPLIER раз."""
    base = max([GALLERY_LIMITS.get(r, 0) for r in (roles or [])] or [0])
    if base and is_pro:
        from apps.billing.models import PRO_LIMIT_MULTIPLIER
        return base * PRO_LIMIT_MULTIPLIER
    return base


class ProfilePhoto(models.Model):
    """Фото в галерее профиля (локации/фотографы). Лимит зависит от ролей (gallery_limit)."""
    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="photos")
    image = models.ImageField(upload_to="gallery/")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"photo {self.id} of {self.profile_id}"


class Favorite(models.Model):
    """Закладка: пользователь сохранил профиль или мастерскую."""
    KIND_CHOICES = [("profile", "Профиль"), ("workshop", "Мастерская")]
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                             related_name="favorites")
    kind = models.CharField(max_length=20, choices=KIND_CHOICES)
    object_id = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "kind", "object_id")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user_id} ♥ {self.kind}:{self.object_id}"


class ProfileView(models.Model):
    """Просмотр профиля. Pro-льгота «кто смотрел». Дедуп: одна строка на
    (viewer, profile, день) — поле day хранит дату для уникальности. Аноним
    НЕ трекается (viewer=NULL не пишем), владелец своего профиля — тоже."""
    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="views")
    viewer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                               related_name="profile_views")
    day = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("profile", "viewer", "day")
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["profile", "-created_at"])]

    def __str__(self):
        return f"{self.viewer_id} 👁 {self.profile_id} @ {self.day}"


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
