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
    """Кабинет: редактирование User (ник, город) + Profile (о себе, опыт) разом."""
    bio = serializers.CharField(required=False, allow_blank=True)
    experience = serializers.CharField(required=False, allow_blank=True, max_length=60)

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "phone", "city",
            "bio", "experience",
            "is_email_verified", "is_phone_verified", "is_verified",
        ]
        read_only_fields = ["email", "phone", "is_email_verified", "is_phone_verified", "is_verified"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        prof = getattr(instance, "profile", None)
        data["bio"] = prof.bio if prof else ""
        data["experience"] = prof.experience if prof else ""
        return data

    def update(self, instance, validated_data):
        bio = validated_data.pop("bio", None)
        experience = validated_data.pop("experience", None)

        # User-поля (ник, город)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Profile-поля (о себе, опыт) — создаём профиль если ещё нет
        if bio is not None or experience is not None:
            from apps.profiles.models import Profile
            prof, _ = Profile.objects.get_or_create(
                user=instance,
                defaults={"display_name": instance.username or instance.email or "user"},
            )
            if bio is not None:
                prof.bio = bio
            if experience is not None:
                prof.experience = experience
            prof.save()

        return instance
