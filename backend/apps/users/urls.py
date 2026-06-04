from django.urls import path

from .views import (
    LoginView,
    LogoutView,
    MeView,
    RegisterView,
    SendEmailOTPView,
    SendTelegramOTPView,
    VerifyEmailOTPView,
    VerifyTelegramOTPView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/", MeView.as_view(), name="me"),
    # Email OTP
    path("send-otp/", SendEmailOTPView.as_view(), name="send-email-otp"),
    path("verify-otp/", VerifyEmailOTPView.as_view(), name="verify-email-otp"),
    # Telegram OTP
    path("send-telegram-otp/", SendTelegramOTPView.as_view(), name="send-telegram-otp"),
    path("verify-telegram-otp/", VerifyTelegramOTPView.as_view(), name="verify-telegram-otp"),
]
