import random
import string
from django.core.cache import cache
from django.core.mail import send_mail
from django.conf import settings

OTP_TTL = 600       # 10 минут
MAX_ATTEMPTS = 5


def _email_key(email: str) -> str:
    return f"otp:email:{email.lower()}"


def generate_otp() -> str:
    return "".join(random.choices(string.digits, k=6))


def save_email_otp(email: str) -> str:
    code = generate_otp()
    cache.set(_email_key(email), f"{code}:0", timeout=OTP_TTL)
    return code


def verify_email_otp(email: str, code: str) -> bool:
    key = _email_key(email)
    stored = cache.get(key)
    if not stored:
        return False
    stored_code, attempts_str = stored.split(":")
    attempts = int(attempts_str)
    if attempts >= MAX_ATTEMPTS:
        cache.delete(key)
        return False
    if stored_code == code.strip():
        cache.delete(key)
        return True
    cache.set(key, f"{stored_code}:{attempts + 1}", timeout=OTP_TTL)
    return False


def send_email_otp(email: str) -> None:
    code = save_email_otp(email)
    html = f"""
    <div style="font-family:sans-serif;max-width:420px;margin:0 auto;padding:24px">
      <h2 style="margin:0 0 8px;font-size:20px">КосплейХаб</h2>
      <p style="color:#555;margin:0 0 20px">Ваш код подтверждения:</p>
      <div style="font-size:36px;font-weight:700;letter-spacing:10px;
                  padding:16px;background:#f4f4f4;border-radius:10px;
                  text-align:center;color:#111">{code}</div>
      <p style="color:#888;font-size:12px;margin:16px 0 0">
        Действителен 10 минут.&nbsp; Не передавайте никому.
      </p>
    </div>
    """
    send_mail(
        subject="Код подтверждения — КосплейХаб",
        message=f"Код подтверждения: {code}\n\nДействителен 10 минут.",
        html_message=html,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[email],
        fail_silently=False,
    )
