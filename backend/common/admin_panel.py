"""Веб админ-панель (/api/v1/admin-panel/...). Доступ только staff.
Управление пользователями: создание, роли, сброс пароля, подписки."""
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.backends import CsrfExemptSessionAuthentication, _normalize_phone
from apps.users.models import User
from apps.profiles.models import Profile, Follow

VALID_ROLES = {"cosplayer", "photographer", "workshop", "shop", "location", "fan"}


def _user_dict(u: User) -> dict:
    prof = getattr(u, "profile", None)
    pro_sub = u.subscriptions.filter(plan="pro", workshop__isnull=True).first()
    return {
        "id": u.id,
        "username": u.username,
        "email": u.email or "",
        "phone": u.phone or "",
        "city": u.city or "",
        "is_staff": u.is_staff,
        "is_active": u.is_active,
        "is_verified": u.is_verified,
        "is_pro": bool(pro_sub and pro_sub.is_active),
        "pro_active_until": pro_sub.active_until if (pro_sub and pro_sub.is_active) else None,
        "roles": (prof.roles if prof else []) or [],
        "role_details": (prof.role_details if prof else {}) or {},
        "profile_id": prof.id if prof else None,
        "followers": u.follower_set.count(),
        "following": u.following_set.count(),
        "avatar": prof.avatar.url if prof and prof.avatar else None,
    }


class _StaffView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAdminUser]


class AdminUsersView(_StaffView):
    """GET — список пользователей (поиск ?q=). POST — создать (логин+пароль)."""

    def get(self, request):
        q = (request.query_params.get("q") or "").strip()
        role = (request.query_params.get("role") or "").strip()
        status_f = (request.query_params.get("status") or "").strip()  # active|blocked|staff
        city = (request.query_params.get("city") or "").strip()

        qs = User.objects.filter(is_superuser=False).select_related("profile").order_by("-id")
        if q:
            qs = qs.filter(Q(username__icontains=q) | Q(email__icontains=q) | Q(phone__icontains=q))
        if role in VALID_ROLES:
            qs = qs.filter(profile__roles__contains=[role])
        if city:
            qs = qs.filter(city__icontains=city)
        if status_f == "active":
            qs = qs.filter(is_active=True)
        elif status_f == "blocked":
            qs = qs.filter(is_active=False)
        elif status_f == "staff":
            qs = qs.filter(is_staff=True)
        return Response([_user_dict(u) for u in qs[:100]])

    def post(self, request):
        d = request.data
        username = (d.get("username") or "").strip()
        identifier = (d.get("identifier") or "").strip()
        password = d.get("password") or ""
        role = (d.get("role") or "fan").strip()

        if not username or not identifier or not password:
            return Response({"detail": "Заполните ник, контакт и пароль"}, status=400)
        if role not in VALID_ROLES:
            role = "fan"
        if User.objects.filter(username=username).exists():
            return Response({"detail": "Ник уже занят"}, status=400)
        try:
            validate_password(password)
        except DjangoValidationError as e:
            return Response({"detail": " ".join(e.messages)}, status=400)

        user = User(username=username, city=(d.get("city") or "").strip())
        if "@" in identifier:
            email = identifier.lower()
            if User.objects.filter(email=email).exists():
                return Response({"detail": "Email уже зарегистрирован"}, status=400)
            user.email = email
            user.is_email_verified = True  # создан админом — сразу активен
        else:
            phone = _normalize_phone(identifier)
            if len(phone) < 11:
                return Response({"detail": "Некорректный email или телефон"}, status=400)
            if User.objects.filter(phone=phone).exists():
                return Response({"detail": "Телефон уже зарегистрирован"}, status=400)
            user.phone = phone
            user.is_phone_verified = True
        user.set_password(password)
        user.save()
        Profile.objects.get_or_create(
            user=user, defaults={"display_name": username, "roles": [role]},
        )
        return Response(_user_dict(user), status=201)


def _get_user(pk):
    return User.objects.filter(pk=pk, is_superuser=False).select_related("profile").first()


class AdminUserRolesView(_StaffView):
    """POST {roles:[...], role_details:{...}} — заменить роли и/или анкеты пользователя.
    role_details — необязательно (админ может править анкету за юзера)."""

    def post(self, request, pk):
        user = _get_user(pk)
        if not user:
            return Response({"detail": "Не найдено"}, status=404)
        roles = [r for r in (request.data.get("roles") or []) if r in VALID_ROLES]
        prof, _ = Profile.objects.get_or_create(
            user=user, defaults={"display_name": user.username, "roles": roles},
        )
        prof.roles = roles
        fields = ["roles"]
        role_details = request.data.get("role_details")
        if isinstance(role_details, dict):
            prof.role_details = role_details
            fields.append("role_details")
        prof.save(update_fields=fields)
        return Response(_user_dict(user))


class AdminUserStaffView(_StaffView):
    """POST {is_staff: bool} — выдать/снять права администратора.
    Нельзя снять с самого себя (чтобы не потерять доступ случайно)."""

    def post(self, request, pk):
        user = _get_user(pk)
        if not user:
            return Response({"detail": "Не найдено"}, status=404)
        if user == request.user:
            return Response({"detail": "Нельзя менять права у самого себя"}, status=400)
        user.is_staff = bool(request.data.get("is_staff"))
        user.save(update_fields=["is_staff"])
        return Response(_user_dict(user))


class AdminUserActiveView(_StaffView):
    """POST {is_active: bool} — заблокировать/разблокировать аккаунт.
    Заблокированный (is_active=False) не может войти и его сессия становится недействительной."""

    def post(self, request, pk):
        user = _get_user(pk)
        if not user:
            return Response({"detail": "Не найдено"}, status=404)
        if user == request.user:
            return Response({"detail": "Нельзя блокировать самого себя"}, status=400)
        user.is_active = bool(request.data.get("is_active"))
        user.save(update_fields=["is_active"])
        return Response(_user_dict(user))


class AdminUserDeleteView(_StaffView):
    """DELETE — полностью удалить аккаунт (со всеми связями: профиль, подписки, заказы)."""

    def delete(self, request, pk):
        user = _get_user(pk)
        if not user:
            return Response({"detail": "Не найдено"}, status=404)
        if user == request.user:
            return Response({"detail": "Нельзя удалить самого себя"}, status=400)
        user.delete()
        return Response(status=204)


class AdminUserPasswordView(_StaffView):
    """POST {password} — задать новый пароль."""

    def post(self, request, pk):
        user = _get_user(pk)
        if not user:
            return Response({"detail": "Не найдено"}, status=404)
        password = request.data.get("password") or ""
        try:
            validate_password(password)
        except DjangoValidationError as e:
            return Response({"detail": " ".join(e.messages)}, status=400)
        user.set_password(password)
        user.save(update_fields=["password"])
        return Response({"ok": True})


class AdminUserSubsView(_StaffView):
    """GET — подписки пользователя. POST {target_id} — подписать."""

    def get(self, request, pk):
        user = _get_user(pk)
        if not user:
            return Response({"detail": "Не найдено"}, status=404)
        out = []
        for f in user.following_set.select_related("target__profile"):
            t = f.target
            prof = getattr(t, "profile", None)
            out.append({
                "target_id": t.id,
                "username": t.username,
                "avatar": prof.avatar.url if prof and prof.avatar else None,
                "since": f.created_at,
            })
        return Response(out)

    def post(self, request, pk):
        user = _get_user(pk)
        if not user:
            return Response({"detail": "Не найдено"}, status=404)
        target_id = request.data.get("target_id")
        target = User.objects.filter(pk=target_id).first()
        if not target or target == user:
            return Response({"detail": "Некорректный пользователь"}, status=400)
        Follow.objects.get_or_create(follower=user, target=target)
        return Response({"ok": True}, status=201)


class AdminUserSubDeleteView(_StaffView):
    """DELETE — отписать пользователя от target."""

    def delete(self, request, pk, target_id):
        user = _get_user(pk)
        if not user:
            return Response({"detail": "Не найдено"}, status=404)
        Follow.objects.filter(follower=user, target_id=target_id).delete()
        return Response(status=204)
