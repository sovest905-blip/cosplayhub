from django.urls import path

from .views import (
    AvatarUploadView,
    CoverUploadView,
    ForgotPasswordView,
    LoginView,
    LogoutView,
    MeView,
    RegisterView,
    ResetPasswordView,
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
    path("avatar/", AvatarUploadView.as_view(), name="avatar-upload"),
    path("cover/", CoverUploadView.as_view(), name="cover-upload"),
    # Email OTP
    path("send-otp/", SendEmailOTPView.as_view(), name="send-email-otp"),
    path("verify-otp/", VerifyEmailOTPView.as_view(), name="verify-email-otp"),
    # Восстановление пароля
    path("forgot-password/", ForgotPasswordView.as_view(), name="forgot-password"),
    path("reset-password/", ResetPasswordView.as_view(), name="reset-password"),
    # Telegram OTP
    path("send-telegram-otp/", SendTelegramOTPView.as_view(), name="send-telegram-otp"),
    path("verify-telegram-otp/", VerifyTelegramOTPView.as_view(), name="verify-telegram-otp"),
]
