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
