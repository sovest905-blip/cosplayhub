from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    """Кастомный пользователь. Логин по email, а не username.
    Заводим с самого начала — потом не переделать без боли."""
    email = models.EmailField("email", unique=True)
    phone = models.CharField("телефон", max_length=20, blank=True)
    city = models.CharField("город", max_length=80, blank=True)
    is_verified = models.BooleanField("верифицирован", default=False)  # синяя галочка
    created_at = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    def __str__(self):
        return self.email
