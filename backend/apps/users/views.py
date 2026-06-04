import logging

from django.conf import settings
from django.contrib.auth import login, logout
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .models import User
from .otp import send_email_otp, verify_email_otp
from .serializers import RegisterSerializer, UserSerializer

logger = logging.getLogger(__name__)


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]
    throttle_scope = "login"
    throttle_classes = [ScopedRateThrottle]

    def perform_create(self, serializer):
        user = serializer.save()
        # Автоматически отправляем OTP после регистрации
        try:
            send_email_otp(user.email)
        except Exception as e:
            logger.error("Failed to send registration OTP to %s: %s", user.email, e)


class LoginView(APIView):
    """Логин по email+пароль → сессия в HttpOnly cookie."""
    permission_classes = [AllowAny]
    throttle_scope = "login"
    throttle_classes = [ScopedRateThrottle]

    def post(self, request):
        from django.contrib.auth import authenticate
        user = authenticate(
            request,
            username=request.data.get("email"),
            password=request.data.get("password"),
        )
        if user is None:
            return Response({"detail": "Неверный email или пароль"},
                            status=status.HTTP_401_UNAUTHORIZED)
        login(request, user)
        return Response(UserSerializer(user).data)


class LogoutView(APIView):
    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


# ── Email OTP ─────────────────────────────────────────────────────────────────

class SendEmailOTPView(APIView):
    """Отправить (или переслать) OTP-код на email."""
    permission_classes = [AllowAny]
    throttle_scope = "otp"
    throttle_classes = [ScopedRateThrottle]

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        if not email:
            return Response({"detail": "Укажите email"}, status=400)
        try:
            User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"detail": "Пользователь не найден"}, status=404)
        try:
            send_email_otp(email)
        except Exception as e:
            logger.error("send_email_otp failed for %s: %s", email, e)
            return Response({"detail": "Не удалось отправить письмо"}, status=502)
        return Response({"detail": "Код отправлен"})


class VerifyEmailOTPView(APIView):
    """Проверить email OTP-код → залогинить."""
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        code = (request.data.get("code") or "").strip()
        if not verify_email_otp(email, code):
            return Response({"detail": "Неверный или устаревший код"}, status=400)
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"detail": "Пользователь не найден"}, status=404)
        user.is_verified = True
        user.save(update_fields=["is_verified"])
        login(request, user)
        return Response(UserSerializer(user).data)


# ── Telegram OTP ──────────────────────────────────────────────────────────────

class SendTelegramOTPView(APIView):
    """Создать Telegram-сессию → вернуть deep-link на бота."""
    permission_classes = [AllowAny]
    throttle_scope = "otp"
    throttle_classes = [ScopedRateThrottle]

    def post(self, request):
        if not getattr(settings, "TELEGRAM_BOT_TOKEN", ""):
            return Response({"detail": "Telegram auth не настроен"}, status=503)

        email = (request.data.get("email") or "").strip().lower()
        if not email:
            return Response({"detail": "Укажите email"}, status=400)
        try:
            User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"detail": "Пользователь не найден"}, status=404)

        from .tgbot import create_telegram_session
        token = create_telegram_session(email)
        bot_username = getattr(settings, "TELEGRAM_BOT_USERNAME", "")
        link = f"https://t.me/{bot_username}?start={token}"
        return Response({"link": link, "token": token})


class VerifyTelegramOTPView(APIView):
    """Проверить Telegram OTP-код → залогинить."""
    permission_classes = [AllowAny]

    def post(self, request):
        token = (request.data.get("token") or "").strip()
        code = (request.data.get("code") or "").strip()
        if not token or not code:
            return Response({"detail": "Укажите token и code"}, status=400)

        from .tgbot import verify_telegram_session
        email = verify_telegram_session(token, code)
        if not email:
            return Response({"detail": "Неверный или устаревший код"}, status=400)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"detail": "Пользователь не найден"}, status=404)

        user.is_verified = True
        user.save(update_fields=["is_verified"])
        login(request, user)
        return Response(UserSerializer(user).data)
