import json
import logging
import uuid
from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.backends import CsrfExemptSessionAuthentication
from . import cryptomus, cryptopay, nowpayments
from .models import Payment, Subscription, TRIAL_MONTHS, add_months
from .serializers import SubscriptionSerializer

log = logging.getLogger(__name__)


class MySubscriptionsView(APIView):
    """GET — подписки текущего пользователя (единый Pro)."""
    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def get(self, request):
        subs = request.user.subscriptions.select_related("workshop").all()
        return Response(SubscriptionSerializer(subs, many=True).data)


class ActivateView(APIView):
    """POST {plan:"pro"} — включить триал единого Pro.

    Единый тариф: один Pro покрывает профиль и ВСЕ мастерские юзера. Легаси
    значение plan="workshop" принимается для обратной совместимости и тоже
    активирует Pro юзера (параметр workshop игнорируется).
    Повторная активация идемпотентна. Триал = TRIAL_MONTHS месяцев от активации.
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def post(self, request):
        plan = (request.data.get("plan") or "pro").strip()
        if plan not in ("pro", "workshop"):
            return Response({"detail": "Неизвестный тариф"}, status=status.HTTP_400_BAD_REQUEST)

        sub = request.user.subscriptions.filter(plan="pro", workshop__isnull=True).first()
        created = False
        if not sub:
            sub = Subscription.objects.create(
                user=request.user, plan="pro", workshop=None,
                source="trial", active_until=add_months(timezone.now(), TRIAL_MONTHS),
            )
            created = True

        return Response(
            SubscriptionSerializer(sub).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


def _apply_pro(user, months: int):
    """Продлить/создать Pro-подписку пользователя после оплаты (source=payment)."""
    if user is None:
        return
    sub = user.subscriptions.filter(plan="pro", workshop__isnull=True).first()
    if sub:
        sub.extend(months, source="payment")
    else:
        Subscription.objects.create(
            user=user, plan="pro", workshop=None, source="payment",
            active_until=add_months(timezone.now(), months),
        )


class CreatePaymentView(APIView):
    """POST — создать инвойс Crypto Pay (@CryptoBot) — единый шлюз для Pro и донатов.

    Crypto Pay: Telegram-нативный, без модерации, минимум ~$0.01, цена в фиате KZT.
    Оплата открывается в Telegram (bot_invoice_url). NOWPayments/Cryptomus оставлены
    в коде как резерв (не в платёжном пути).

    body: {purpose: "pro"|"donate_site", months?, amount?}
      pro         → сумма = PRO_PRICE * months (месяц 1..12), нужен вход.
      donate_site → сумма из amount (валюта PAY_CURRENCY=KZT), можно анонимно.
    Возвращает {url} — ссылка оплаты в Telegram.
    """
    permission_classes = [AllowAny]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def post(self, request):
        if not cryptopay.is_configured():
            return Response({"detail": "Оплата временно недоступна"},
                            status=status.HTTP_503_SERVICE_UNAVAILABLE)

        purpose = (request.data.get("purpose") or "").strip()
        if purpose not in ("pro", "donate_site"):
            return Response({"detail": "Неизвестное назначение платежа"},
                            status=status.HTTP_400_BAD_REQUEST)

        months = 1
        if purpose == "pro":
            if not request.user.is_authenticated:
                return Response({"detail": "Требуется вход"}, status=status.HTTP_401_UNAUTHORIZED)
            try:
                months = max(1, min(12, int(request.data.get("months", 1))))
            except (TypeError, ValueError):
                months = 1
            amount = (Decimal(str(settings.PRO_PRICE)) * months).quantize(Decimal("0.01"))
            description = f"CosplayHub Pro — {months} мес."
        else:  # donate_site
            try:
                amount = Decimal(str(request.data.get("amount", "0"))).quantize(Decimal("0.01"))
            except (InvalidOperation, TypeError):
                return Response({"detail": "Некорректная сумма"}, status=status.HTTP_400_BAD_REQUEST)
            if amount <= 0:
                return Response({"detail": "Сумма должна быть больше нуля"},
                                status=status.HTTP_400_BAD_REQUEST)
            description = "Донат на поддержку КосплейХаб"

        order_id = uuid.uuid4().hex
        payment = Payment.objects.create(
            user=request.user if request.user.is_authenticated else None,
            purpose=purpose, gateway="cryptopay", amount=amount, currency=settings.PAY_CURRENCY,
            months=months, order_id=order_id,
        )

        base = settings.SITE_URL
        return_url = f"{base}/cabinet?tab=subs" if purpose == "pro" else f"{base}/?donate=thanks"
        try:
            result = cryptopay.create_invoice(
                amount=amount, fiat=settings.PAY_CURRENCY.upper(),
                description=description, payload=order_id, paid_btn_url=return_url,
            )
        except cryptopay.GatewayError as e:
            log.warning("Crypto Pay createInvoice failed: %s", e)
            payment.status = "failed"
            payment.save(update_fields=["status", "updated_at"])
            return Response({"detail": "Платёжный шлюз недоступен, попробуйте позже"},
                            status=status.HTTP_502_BAD_GATEWAY)

        payment.invoice_uuid = str(result.get("invoice_id", ""))
        payment.pay_url = result.get("bot_invoice_url", "") or result.get("mini_app_invoice_url", "")
        payment.raw = result
        payment.save(update_fields=["invoice_uuid", "pay_url", "raw", "updated_at"])

        if not payment.pay_url:
            return Response({"detail": "Не удалось создать платёж"},
                            status=status.HTTP_502_BAD_GATEWAY)
        return Response({"url": payment.pay_url}, status=status.HTTP_201_CREATED)


class NowPaymentsWebhookView(APIView):
    """POST — вебхук (IPN) NOWPayments. Публичный, с проверкой HMAC-SHA512.

    При статусе finished — продлевает Pro (идемпотентно по paid_at).
    Всегда отвечает 200, чтобы шлюз не ретраил бесконечно (кроме плохой подписи).
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        signature = request.headers.get("x-nowpayments-sig", "")
        if not nowpayments.verify_webhook(request.body, signature):
            log.warning("NOWPayments webhook: bad sign")
            return Response({"detail": "bad sign"}, status=status.HTTP_403_FORBIDDEN)

        try:
            data = json.loads(request.body.decode() or "{}")
        except (ValueError, UnicodeDecodeError):
            return Response({"detail": "bad body"}, status=status.HTTP_400_BAD_REQUEST)

        payment = Payment.objects.filter(order_id=data.get("order_id", "")).first()
        if not payment:
            return Response({"detail": "unknown order"}, status=status.HTTP_200_OK)

        payment.raw = data
        gw_status = (data.get("payment_status") or "").lower()
        # finished = оплачено и зачислено; confirmed можно тоже считать успехом.
        paid_statuses = {"finished", "confirmed"}
        fail_statuses = {"failed", "refunded", "expired"}

        if gw_status in paid_statuses and payment.status != "paid":
            payment.status = "paid"
            payment.paid_at = timezone.now()
            if payment.purpose == "pro":
                _apply_pro(payment.user, payment.months)
        elif gw_status in fail_statuses and payment.status == "pending":
            payment.status = "failed"

        payment.save(update_fields=["status", "paid_at", "raw", "updated_at"])
        return Response({"detail": "ok"}, status=status.HTTP_200_OK)


class CryptomusWebhookView(APIView):
    """POST — вебхук Cryptomus (донаты сайту). Публичный, с проверкой подписи md5.

    Донаты Pro не выдают — только фиксируют оплату. Всегда 200 (кроме плохой подписи).
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        try:
            data = json.loads(request.body.decode() or "{}")
        except (ValueError, UnicodeDecodeError):
            return Response({"detail": "bad body"}, status=status.HTTP_400_BAD_REQUEST)

        if not cryptomus.verify_webhook(data):
            log.warning("Cryptomus webhook: bad sign (order_id=%s)", data.get("order_id"))
            return Response({"detail": "bad sign"}, status=status.HTTP_403_FORBIDDEN)

        payment = Payment.objects.filter(order_id=data.get("order_id", "")).first()
        if not payment:
            return Response({"detail": "unknown order"}, status=status.HTTP_200_OK)

        payment.raw = data
        gw_status = (data.get("status") or "").lower()
        paid_statuses = {"paid", "paid_over"}
        fail_statuses = {"fail", "cancel", "system_fail", "wrong_amount"}

        if gw_status in paid_statuses and payment.status != "paid":
            payment.status = "paid"
            payment.paid_at = timezone.now()
            if payment.purpose == "pro":  # на случай будущего роутинга Pro через Cryptomus
                _apply_pro(payment.user, payment.months)
        elif gw_status in fail_statuses and payment.status == "pending":
            payment.status = "failed"

        payment.save(update_fields=["status", "paid_at", "raw", "updated_at"])
        return Response({"detail": "ok"}, status=status.HTTP_200_OK)


class CryptoPayWebhookView(APIView):
    """POST — вебхук Crypto Pay (@CryptoBot). Публичный, с проверкой HMAC-SHA256.

    Тело: {update_type:"invoice_paid", payload:{invoice}}. В invoice.payload лежит
    наш order_id, status="paid". Активирует Pro / фиксит донат (идемпотентно).
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        signature = request.headers.get("crypto-pay-api-signature", "")
        if not cryptopay.verify_webhook(request.body, signature):
            log.warning("Crypto Pay webhook: bad sign")
            return Response({"detail": "bad sign"}, status=status.HTTP_403_FORBIDDEN)

        try:
            data = json.loads(request.body.decode() or "{}")
        except (ValueError, UnicodeDecodeError):
            return Response({"detail": "bad body"}, status=status.HTTP_400_BAD_REQUEST)

        if data.get("update_type") != "invoice_paid":
            return Response({"detail": "ignored"}, status=status.HTTP_200_OK)

        invoice = data.get("payload", {})
        order_id = invoice.get("payload", "")
        payment = Payment.objects.filter(order_id=order_id).first()
        if not payment:
            return Response({"detail": "unknown order"}, status=status.HTTP_200_OK)

        payment.raw = data
        if (invoice.get("status") or "").lower() == "paid" and payment.status != "paid":
            payment.status = "paid"
            payment.paid_at = timezone.now()
            if payment.purpose == "pro":
                _apply_pro(payment.user, payment.months)

        payment.save(update_fields=["status", "paid_at", "raw", "updated_at"])
        return Response({"detail": "ok"}, status=status.HTTP_200_OK)
