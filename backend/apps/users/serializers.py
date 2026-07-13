from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.db.models import F, Q
from rest_framework import serializers

from .backends import _normalize_phone
from .models import Invite, User


class RegisterSerializer(serializers.Serializer):
    """Регистрация по email ИЛИ телефону. При INVITE_REQUIRED — только по коду инвайта."""
    identifier = serializers.CharField()
    username = serializers.CharField()
    password = serializers.CharField(write_only=True, validators=[validate_password])
    city = serializers.CharField(required=False, allow_blank=True, default="")
    invite = serializers.CharField(required=False, allow_blank=True, default="")

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

        # Инвайт: явный код проверяем всегда; без кода — пускаем только если флаг выключен.
        code = (attrs.get("invite") or "").strip()
        attrs["_invite"] = None
        if code:
            inv = Invite.objects.filter(code__iexact=code).first()
            if not inv or not inv.has_room:
                raise serializers.ValidationError({"invite": "Инвайт не найден или уже использован"})
            attrs["_invite"] = inv
        elif getattr(settings, "INVITE_REQUIRED", False):
            raise serializers.ValidationError({"invite": "Регистрация только по инвайту — укажите код"})

        return attrs

    def create(self, validated_data):
        kind = validated_data["_kind"]
        value = validated_data["_value"]

        # Атомарно «занимаем» место в инвайте (защита от гонки двух регистраций).
        inv = validated_data.get("_invite")
        if inv:
            claimed = Invite.objects.filter(pk=inv.pk, is_active=True).filter(
                Q(max_uses=0) | Q(used_count__lt=F("max_uses"))
            ).update(used_count=F("used_count") + 1)
            if not claimed:
                raise serializers.ValidationError({"invite": "Инвайт не найден или уже использован"})

        user = User(
            username=validated_data["username"],
            city=validated_data.get("city", ""),
            invite=inv,
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
    # Pro-кастомизация (записывается только при активном Pro; см. update)
    slug = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    accent_color = serializers.CharField(required=False, allow_blank=True)
    hide_from_catalog = serializers.BooleanField(required=False)
    pinned_look_ids = serializers.ListField(child=serializers.IntegerField(), required=False)
    donation_methods = serializers.ListField(child=serializers.DictField(), required=False)
    mascot = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "phone", "city",
            "bio", "experience", "roles", "available_for_work", "accept_messages",
            "role_details", "socials", "profile_id",
            "slug", "accent_color", "hide_from_catalog", "pinned_look_ids", "donation_methods", "mascot",
            "is_email_verified", "is_phone_verified", "is_verified", "is_staff",
        ]
        read_only_fields = ["email", "phone", "is_email_verified", "is_phone_verified", "is_verified", "is_staff"]

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
        data["slug"] = prof.slug if prof else None
        data["accent_color"] = prof.accent_color if prof else "#ff2d6f"
        data["hide_from_catalog"] = prof.hide_from_catalog if prof else False
        data["pinned_look_ids"] = (prof.pinned_look_ids or []) if prof else []
        data["donation_methods"] = (prof.donation_methods or []) if prof else []
        data["mascot"] = (prof.mascot or "") if prof else ""
        # Картинка маскота из библиотеки (только при активном Pro — показ в шапке/кабинете).
        data["mascot_image"] = ""
        _slug = (prof.mascot or "") if prof else ""
        if _slug and instance.is_pro:
            from apps.profiles.models import Mascot
            _m = Mascot.objects.filter(slug=_slug, is_active=True).first()
            data["mascot_image"] = _m.img if _m else ""
        # Pro-статус из billing (вычисляется по сроку)
        pro_sub = instance.subscriptions.filter(plan="pro", workshop__isnull=True).first()
        data["is_pro"] = bool(pro_sub and pro_sub.is_active)
        data["pro_active_until"] = pro_sub.active_until if (pro_sub and pro_sub.is_active) else None
        return data

    def _apply_pro_fields(self, instance, validated_data, prof_fields):
        """Pro-кастомизация (slug/accent/hide/pinned) — пишется ТОЛЬКО при активном Pro.
        Не-Pro значения молча игнорируем (поля просто не применяются)."""
        from django.utils.text import slugify
        pro_keys = ("slug", "accent_color", "hide_from_catalog", "pinned_look_ids", "donation_methods", "mascot")
        incoming = {k: validated_data.pop(k) for k in pro_keys if k in validated_data}
        if not incoming or not instance.is_pro:
            return
        if "slug" in incoming:
            raw = (incoming["slug"] or "").strip()
            if not raw:
                prof_fields["slug"] = None
            else:
                s = slugify(raw, allow_unicode=False)[:40]
                if not s:
                    raise serializers.ValidationError({"slug": "Недопустимая ссылка (только латиница/цифры/дефис)"})
                from apps.profiles.models import Profile
                if Profile.objects.filter(slug=s).exclude(user=instance).exists():
                    raise serializers.ValidationError({"slug": "Эта ссылка уже занята"})
                prof_fields["slug"] = s
        if "accent_color" in incoming:
            prof_fields["accent_color"] = (incoming["accent_color"] or "#ff2d6f")[:7]
        if "hide_from_catalog" in incoming:
            prof_fields["hide_from_catalog"] = bool(incoming["hide_from_catalog"])
        if "pinned_look_ids" in incoming:
            prof_fields["pinned_look_ids"] = list(incoming["pinned_look_ids"])[:3]  # максимум 3
        if "mascot" in incoming:
            valid_mascots = {"chameleon", "kitsune", "robot", "octopus", "owl", "slime"}
            m = (incoming["mascot"] or "").strip()
            prof_fields["mascot"] = m if m in valid_mascots else ""
        if "donation_methods" in incoming:
            valid_kinds = {"usdt_trc20", "ton", "btc"}
            cleaned = []
            for m in (incoming["donation_methods"] or [])[:6]:
                kind = str(m.get("kind", "")).strip()
                addr = str(m.get("address", "")).strip()
                if kind in valid_kinds and addr:
                    cleaned.append({"kind": kind, "address": addr[:120]})
            prof_fields["donation_methods"] = cleaned

    def update(self, instance, validated_data):
        socials = validated_data.pop("socials", None)
        prof_fields = {}
        for key in ("bio", "experience", "roles", "available_for_work", "accept_messages", "role_details"):
            if key in validated_data:
                prof_fields[key] = validated_data.pop(key)
        self._apply_pro_fields(instance, validated_data, prof_fields)

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
