from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .backends import _normalize_phone
from .models import User


class RegisterSerializer(serializers.Serializer):
    """Регистрация по email ИЛИ телефону."""
    identifier = serializers.CharField()
    username = serializers.CharField()
    password = serializers.CharField(write_only=True, validators=[validate_password])
    city = serializers.CharField(required=False, allow_blank=True, default="")

    def _detect(self, identifier: str) -> tuple[str, str]:
        """Возвращает ('email'|'phone', нормализованное значение)."""
        identifier = identifier.strip()
        if "@" in identifier:
            return "email", identifier.lower()
        phone = _normalize_phone(identifier)
        if len(phone) >= 11:
            return "phone", phone
        raise serializers.ValidationError(
            {"identifier": "Введите корректный email или номер телефона"}
        )

    def validate(self, attrs):
        kind, value = self._detect(attrs["identifier"])
        attrs["_kind"] = kind
        attrs["_value"] = value

        if kind == "email" and User.objects.filter(email=value).exists():
            raise serializers.ValidationError({"identifier": "Email уже зарегистрирован"})
        if kind == "phone" and User.objects.filter(phone=value).exists():
            raise serializers.ValidationError({"identifier": "Телефон уже зарегистрирован"})
        if User.objects.filter(username=attrs["username"]).exists():
            raise serializers.ValidationError({"username": "Ник уже занят"})

        return attrs

    def create(self, validated_data):
        kind = validated_data["_kind"]
        value = validated_data["_value"]
        user = User(
            username=validated_data["username"],
            city=validated_data.get("city", ""),
        )
        if kind == "email":
            user.email = value
        else:
            user.phone = value
        user.set_password(validated_data["password"])
        user.save()
        # Дефолтная роль «фанат» — каждый зарегистрированный сразу может подписываться/смотреть.
        from apps.profiles.models import Profile
        Profile.objects.get_or_create(
            user=user,
            defaults={"display_name": user.username or value, "roles": ["fan"]},
        )
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id", "username", "email", "phone", "telegram_id",
            "city", "is_email_verified", "is_phone_verified", "is_verified",
        ]
        read_only_fields = ["is_email_verified", "is_phone_verified", "is_verified", "telegram_id"]


class MeSerializer(serializers.ModelSerializer):
    """Кабинет: редактирование User (ник, город) + Profile (о себе, опыт, роли, статус) разом."""
    bio = serializers.CharField(required=False, allow_blank=True)
    experience = serializers.CharField(required=False, allow_blank=True, max_length=60)
    roles = serializers.ListField(child=serializers.CharField(), required=False)
    available_for_work = serializers.BooleanField(required=False)
    accept_messages = serializers.BooleanField(required=False)
    role_details = serializers.DictField(required=False)
    socials = serializers.ListField(child=serializers.DictField(), required=False)
    profile_id = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "phone", "city",
            "bio", "experience", "roles", "available_for_work", "accept_messages",
            "role_details", "socials", "profile_id",
            "is_email_verified", "is_phone_verified", "is_verified",
        ]
        read_only_fields = ["email", "phone", "is_email_verified", "is_phone_verified", "is_verified"]

    def get_profile_id(self, instance):
        prof = getattr(instance, "profile", None)
        return prof.id if prof else None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        prof = getattr(instance, "profile", None)
        data["bio"] = prof.bio if prof else ""
        data["experience"] = prof.experience if prof else ""
        data["roles"] = prof.roles if prof else []
        data["available_for_work"] = prof.available_for_work if prof else False
        data["accept_messages"] = prof.accept_messages if prof else True
        data["role_details"] = (prof.role_details or {}) if prof else {}
        data["socials"] = (
            [{"platform": s.platform, "handle": s.handle} for s in prof.socials.all()]
            if prof else []
        )
        data["avatar"] = prof.avatar.url if prof and prof.avatar else None
        data["cover"] = prof.cover.url if prof and prof.cover else None
        return data

    def update(self, instance, validated_data):
        socials = validated_data.pop("socials", None)
        prof_fields = {}
        for key in ("bio", "experience", "roles", "available_for_work", "accept_messages", "role_details"):
            if key in validated_data:
                prof_fields[key] = validated_data.pop(key)

        # User-поля (ник, город)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Profile-поля — создаём профиль если ещё нет
        if prof_fields or socials is not None:
            from apps.profiles.models import Profile
            prof, _ = Profile.objects.get_or_create(
                user=instance,
                defaults={"display_name": instance.username or instance.email or "user", "roles": ["fan"]},
            )
            # ник профиля держим в синхроне с username
            if instance.username:
                prof.display_name = instance.username
            for attr, value in prof_fields.items():
                setattr(prof, attr, value)
            prof.save()

            # Соцсети: полная замена набора (платформа+хэндл, пустые игнорируем)
            if socials is not None:
                from apps.profiles.models import SocialLink
                prof.socials.all().delete()
                links = [
                    SocialLink(profile=prof, platform=str(s.get("platform", "")).strip(),
                               handle=str(s.get("handle", "")).strip(), is_connected=True)
                    for s in socials
                    if str(s.get("platform", "")).strip() and str(s.get("handle", "")).strip()
                ]
                if links:
                    SocialLink.objects.bulk_create(links)

        return instance
