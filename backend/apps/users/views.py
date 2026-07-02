import logging

from django.conf import settings
from django.contrib.auth import login, logout, update_session_auth_hash
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .backends import CsrfExemptSessionAuthentication, resolve_user
from .models import User
from .otp import (
    send_email_change_otp, send_email_otp, send_reset_otp,
    verify_email_change_otp, verify_email_otp, verify_reset_otp,
)
from .serializers import MeSerializer, RegisterSerializer, UserSerializer

logger = logging.getLogger(__name__)


# ── Регистрация ───────────────────────────────────────────────────────────────

class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "login"
    throttle_classes = [ScopedRateThrottle]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.save()
        kind = serializer.validated_data["_kind"]

        if kind == "email":
            # Отправляем OTP на email — фронт перекинет на /auth/verify-email
            try:
                send_email_otp(user.email)
            except Exception as e:
                logger.error("OTP send failed for %s: %s", user.email, e)
            return Response(
                {"id": user.id, "kind": "email", "email": user.email},
                status=status.HTTP_201_CREATED,
            )
        else:
            # Телефон: OTP через Telegram если настроен, иначе авто-логин для теста
            if getattr(settings, "TELEGRAM_BOT_TOKEN", ""):
                from .tgbot import create_telegram_session
                token = create_telegram_session(user.phone)
                bot = getattr(settings, "TELEGRAM_BOT_USERNAME", "")
                link = f"https://t.me/{bot}?start={token}"
                return Response(
                    {"id": user.id, "kind": "phone", "phone": user.phone,
                     "tg_link": link, "tg_token": token},
                    status=status.HTTP_201_CREATED,
                )
            elif settings.DEBUG:
                # ТОЛЬКО dev/тест: Telegram не настроен — логиним без верификации.
                user.is_phone_verified = True
                user.save(update_fields=["is_phone_verified"])
                login(request, user)
                return Response(
                    {"id": user.id, "kind": "phone", "phone": user.phone, "auto_login": True},
                    status=status.HTTP_201_CREATED,
                )
            else:
                # Прод без Telegram: подтвердить владение номером нечем — регистрацию
                # НЕ завершаем и не выдаём сессию (иначе можно завести аккаунт на чужой номер).
                user.delete()
                return Response(
                    {"detail": "Регистрация по телефону временно недоступна"},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )


class InviteCheckView(APIView):
    """GET [?code=] — нужен ли инвайт для регистрации и валиден ли код.
    Для формы /auth/register: без code отдаёт только {required}, с code — ещё {valid}.
    Коды случайные (10 симв.), перебор бессмыслен + общий anon-троттлинг."""
    permission_classes = [AllowAny]

    def get(self, request):
        out = {"required": bool(getattr(settings, "INVITE_REQUIRED", False))}
        code = (request.query_params.get("code") or "").strip()
        if code:
            from .models import Invite
            inv = Invite.objects.filter(code__iexact=code).first()
            out["valid"] = bool(inv and inv.has_room)
        return Response(out)


# ── Вход ──────────────────────────────────────────────────────────────────────

class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "login"
    throttle_classes = [ScopedRateThrottle]

    def post(self, request):
        identifier = (request.data.get("identifier") or "").strip()
        password = request.data.get("password", "")

        from django.contrib.auth import authenticate
        user = authenticate(request, username=identifier, password=password)
        if user is None:
            return Response(
                {"detail": "Неверные данные для входа"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        login(request, user)
        return Response(UserSerializer(user).data)


class LogoutView(APIView):
    # Без CSRF/сессионной auth: logout гасит сессию сам. SessionAuthentication
    # требовала бы CSRF-токен на этот POST → 403, и выход не срабатывал.
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


@method_decorator(ensure_csrf_cookie, name="dispatch")
class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = MeSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfExemptSessionAuthentication]
    # ensure_csrf_cookie: GET /auth/me/ (дёргается AuthNav на каждой странице)
    # гарантирует, что у залогиненного всегда свежая csrftoken-cookie для X-CSRFToken.

    def get_object(self):
        return self.request.user


# ── Настройки аккаунта (кабинет → Настройки) ──────────────────────────────────

class ChangePasswordView(APIView):
    """POST {current_password, new_password} — смена пароля залогиненным.
    Сессия сохраняется (update_session_auth_hash), повторный вход не нужен."""
    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def post(self, request):
        user = request.user
        current = request.data.get("current_password") or ""
        new_password = request.data.get("new_password") or ""
        if not user.check_password(current):
            return Response({"detail": "Текущий пароль неверный"}, status=400)
        try:
            validate_password(new_password, user)
        except ValidationError as e:
            return Response({"detail": e.messages[0]}, status=400)
        user.set_password(new_password)
        user.save(update_fields=["password"])
        update_session_auth_hash(request, user)  # иначе смена пароля разлогинивает
        return Response({"ok": True})


class DeleteAccountView(APIView):
    """POST {password} — самоудаление аккаунта. Требует подтверждения паролем.
    Сносит профиль/заказы/слоты и т.д. по CASCADE; сессия гасится."""
    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def post(self, request):
        user = request.user
        if not user.check_password(request.data.get("password") or ""):
            return Response({"detail": "Пароль неверный"}, status=400)
        logout(request)
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ChangeEmailRequestView(APIView):
    """POST {new_email} — запросить смену email: код уходит на НОВЫЙ адрес.
    Подтверждение — в ChangeEmailConfirmView. Троттлинг как у OTP."""
    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfExemptSessionAuthentication]
    throttle_scope = "otp"
    throttle_classes = [ScopedRateThrottle]

    def post(self, request):
        new_email = (request.data.get("new_email") or "").strip().lower()
        if "@" not in new_email or "." not in new_email.split("@")[-1]:
            return Response({"detail": "Введите корректный email"}, status=400)
        if new_email == (request.user.email or "").lower():
            return Response({"detail": "Это ваш текущий email"}, status=400)
        if User.objects.filter(email=new_email).exclude(pk=request.user.pk).exists():
            return Response({"detail": "Email уже занят"}, status=400)
        try:
            send_email_change_otp(request.user.id, new_email)
        except Exception as e:
            logger.error("send_email_change_otp failed: %s", e)
            return Response({"detail": "Не удалось отправить код, попробуйте позже"}, status=503)
        return Response({"detail": "Код отправлен на новый адрес"})


class ChangeEmailConfirmView(APIView):
    """POST {code} — подтвердить смену email кодом из письма на новый адрес."""
    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def post(self, request):
        code = (request.data.get("code") or "").strip()
        new_email = verify_email_change_otp(request.user.id, code)
        if not new_email:
            return Response({"detail": "Неверный или устаревший код"}, status=400)
        # Гонка: адрес мог занять кто-то между запросом и подтверждением
        if User.objects.filter(email=new_email).exclude(pk=request.user.pk).exists():
            return Response({"detail": "Email уже занят"}, status=400)
        request.user.email = new_email
        request.user.is_email_verified = True
        request.user.save(update_fields=["email", "is_email_verified"])
        return Response({"email": new_email})


# ── Email OTP ─────────────────────────────────────────────────────────────────

class SendEmailOTPView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "otp"
    throttle_classes = [ScopedRateThrottle]

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        if not email:
            return Response({"detail": "Укажите email"}, status=400)
        # Не раскрываем, существует ли аккаунт (защита от перечисления юзеров):
        # ответ одинаков для существующего и несуществующего email; письмо шлём
        # только если юзер реально есть.
        user = User.objects.filter(email=email).first()
        if user:
            try:
                send_email_otp(email)
            except Exception as e:
                logger.error("send_email_otp failed for %s: %s", email, e)
        return Response({"detail": "Если аккаунт существует, код отправлен"})


class VerifyEmailOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        code = (request.data.get("code") or "").strip()
        if not verify_email_otp(email, code):
            return Response({"detail": "Неверный или устаревший код"}, status=400)
        user = User.objects.filter(email=email).first()
        if not user:
            return Response({"detail": "Пользователь не найден"}, status=404)
        user.is_email_verified = True
        user.save(update_fields=["is_email_verified"])
        login(request, user)
        return Response(UserSerializer(user).data)


# ── Восстановление пароля ─────────────────────────────────────────────────────

class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "otp"
    throttle_classes = [ScopedRateThrottle]

    def post(self, request):
        identifier = (request.data.get("identifier") or "").strip()
        user = resolve_user(identifier)

        # Email-аккаунт → код на почту. НЕ эхопим реальный email (защита от
        # перечисления): фронт использует введённый идентификатор. Ответ для
        # существующего и несуществующего email идентичен (см. ветку «не найден»).
        if user and user.email:
            try:
                send_reset_otp(user.email)
            except Exception as e:
                logger.error("send_reset_otp failed: %s", e)
            return Response({"method": "email", "email": "",
                             "detail": "Если аккаунт существует, код отправлен"})

        # Телефонный аккаунт → код в Telegram
        if user and user.phone:
            if not getattr(settings, "TELEGRAM_BOT_TOKEN", ""):
                return Response({"detail": "Восстановление по телефону пока недоступно"}, status=503)
            from .tgbot import create_telegram_session
            token = create_telegram_session(user.phone)
            bot = getattr(settings, "TELEGRAM_BOT_USERNAME", "")
            return Response({
                "method": "telegram",
                "tg_link": f"https://t.me/{bot}?start={token}",
                "tg_token": token,
                "detail": "Получите код в Telegram",
            })

        # Аккаунт не найден — не раскрываем
        return Response({"method": "email", "email": "",
                         "detail": "Если аккаунт существует, код отправлен"})


class ResetPasswordView(APIView):
    """Сброс пароля по email-коду ИЛИ по Telegram-токену."""
    permission_classes = [AllowAny]

    def post(self, request):
        new_password = request.data.get("new_password", "")
        tg_token = (request.data.get("tg_token") or "").strip()
        code = (request.data.get("code") or "").strip()

        # Ветка Telegram (телефонный аккаунт)
        if tg_token:
            from .tgbot import verify_telegram_session
            identifier = verify_telegram_session(tg_token, code)
            if not identifier:
                return Response({"detail": "Неверный или устаревший код"}, status=400)
            user = resolve_user(identifier)
        # Ветка email
        else:
            email = (request.data.get("email") or "").strip().lower()
            if not verify_reset_otp(email, code):
                return Response({"detail": "Неверный или устаревший код"}, status=400)
            user = User.objects.filter(email=email).first()

        if not user:
            return Response({"detail": "Пользователь не найден"}, status=404)

        try:
            validate_password(new_password, user)
        except ValidationError as e:
            return Response({"detail": e.messages[0]}, status=400)

        user.set_password(new_password)
        user.save(update_fields=["password"])
        login(request, user)
        return Response(UserSerializer(user).data)


# ── Telegram OTP ──────────────────────────────────────────────────────────────

class SendTelegramOTPView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "otp"
    throttle_classes = [ScopedRateThrottle]

    def post(self, request):
        if not getattr(settings, "TELEGRAM_BOT_TOKEN", ""):
            return Response({"detail": "Telegram auth не настроен"}, status=503)

        identifier = (request.data.get("identifier") or "").strip()
        if not identifier:
            return Response({"detail": "Укажите email или телефон"}, status=400)

        user = resolve_user(identifier)
        if not user:
            return Response({"detail": "Пользователь не найден"}, status=404)

        from .tgbot import create_telegram_session
        # Передаём email если есть, иначе телефон
        session_id = user.email or user.phone
        token = create_telegram_session(session_id)
        bot = getattr(settings, "TELEGRAM_BOT_USERNAME", "")
        return Response({
            "link": f"https://t.me/{bot}?start={token}",
            "token": token,
        })


class VerifyTelegramOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token = (request.data.get("token") or "").strip()
        code = (request.data.get("code") or "").strip()
        if not token or not code:
            return Response({"detail": "Укажите token и code"}, status=400)

        from .tgbot import verify_telegram_session
        session_id = verify_telegram_session(token, code)
        if not session_id:
            return Response({"detail": "Неверный или устаревший код"}, status=400)

        # session_id — это email или телефон
        user = resolve_user(session_id)
        if not user:
            return Response({"detail": "Пользователь не найден"}, status=404)

        if "@" in session_id:
            user.is_email_verified = True
            user.save(update_fields=["is_email_verified"])
        else:
            user.is_phone_verified = True
            user.save(update_fields=["is_phone_verified"])

        login(request, user)
        return Response(UserSerializer(user).data)


# ── Загрузка фото профиля ─────────────────────────────────────────────────────

class _PhotoUploadBase(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfExemptSessionAuthentication]
    field_name: str
    max_size = 5 * 1024 * 1024  # 5 МБ

    def post(self, request):
        file = request.FILES.get("file")
        if not file:
            return Response({"detail": "Файл не передан"}, status=status.HTTP_400_BAD_REQUEST)
        # Реальная проверка через Pillow + безопасное расширение (не доверяем content_type)
        from common.uploads import validate_image, safe_image_name
        try:
            ext = validate_image(file, max_size=self.max_size)
        except DRFValidationError as e:
            return Response({"detail": e.detail[0] if isinstance(e.detail, list) else str(e.detail)},
                            status=status.HTTP_400_BAD_REQUEST)

        from apps.profiles.models import Profile
        prof, _ = Profile.objects.get_or_create(
            user=request.user,
            defaults={"display_name": request.user.username or request.user.email or "user"},
        )
        old = getattr(prof, self.field_name)
        if old:
            old.delete(save=False)
        getattr(prof, self.field_name).save(safe_image_name(self.field_name, ext), file, save=True)
        return Response({"url": getattr(prof, self.field_name).url})


class AvatarUploadView(_PhotoUploadBase):
    field_name = "avatar"

    def delete(self, request):
        from apps.profiles.models import Profile
        prof = getattr(request.user, "profile", None)
        if prof and prof.avatar:
            prof.avatar.delete(save=True)
        return Response(status=status.HTTP_204_NO_CONTENT)


class CoverUploadView(_PhotoUploadBase):
    field_name = "cover"

    def delete(self, request):
        from apps.profiles.models import Profile
        prof = getattr(request.user, "profile", None)
        if prof and prof.cover:
            prof.cover.delete(save=True)
        return Response(status=status.HTTP_204_NO_CONTENT)
