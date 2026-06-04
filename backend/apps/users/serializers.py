import re

from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import User


def normalize_phone(raw: str) -> str:
    digits = re.sub(r"\D", "", raw)
    if len(digits) == 11 and digits.startswith("8"):
        digits = "7" + digits[1:]
    if len(digits) == 10:
        digits = "7" + digits
    return "+" + digits if digits else raw


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = User
        fields = ["id", "email", "username", "password", "phone", "city"]

    def validate_phone(self, value):
        if not value:
            return value
        normalized = normalize_phone(value)
        if len(re.sub(r"\D", "", normalized)) < 10:
            raise serializers.ValidationError("Некорректный номер телефона")
        if User.objects.filter(phone=normalized).exists():
            raise serializers.ValidationError("Этот номер уже зарегистрирован")
        return normalized

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "username", "phone", "city", "is_verified"]
        read_only_fields = ["is_verified"]
