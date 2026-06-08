from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.backends import CsrfExemptSessionAuthentication
from apps.workshops.models import Workshop
from .models import Subscription, TRIAL_MONTHS, add_months
from .serializers import SubscriptionSerializer
from django.utils import timezone


class MySubscriptionsView(APIView):
    """GET — подписки текущего пользователя (Pro профиля + тарифы его мастерских)."""
    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def get(self, request):
        subs = request.user.subscriptions.select_related("workshop").all()
        return Response(SubscriptionSerializer(subs, many=True).data)


class ActivateView(APIView):
    """POST {plan:"pro"} или {plan:"workshop", workshop:<id>} — включить триал.

    Если подписка уже есть — возвращаем её (повторная активация ничего не ломает).
    Триал = TRIAL_MONTHS месяцев бесплатно от момента активации.
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def post(self, request):
        plan = (request.data.get("plan") or "").strip()
        if plan not in ("pro", "workshop"):
            return Response({"detail": "Неизвестный тариф"}, status=status.HTTP_400_BAD_REQUEST)

        if plan == "pro":
            sub = request.user.subscriptions.filter(plan="pro", workshop__isnull=True).first()
            created = False
            if not sub:
                sub = Subscription.objects.create(
                    user=request.user, plan="pro", workshop=None,
                    source="trial", active_until=add_months(timezone.now(), TRIAL_MONTHS),
                )
                created = True
        else:
            wid = request.data.get("workshop")
            ws = Workshop.objects.filter(pk=wid, owner=request.user).first()
            if not ws:
                return Response({"detail": "Мастерская не найдена или не ваша"}, status=status.HTTP_404_NOT_FOUND)
            sub, created = Subscription.objects.get_or_create(
                workshop=ws, plan="workshop",
                defaults={
                    "user": request.user,
                    "source": "trial",
                    "active_until": add_months(timezone.now(), TRIAL_MONTHS),
                },
            )

        return Response(
            SubscriptionSerializer(sub).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )
