from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.backends import CsrfExemptSessionAuthentication
from .models import Subscription, TRIAL_MONTHS, add_months
from .serializers import SubscriptionSerializer
from django.utils import timezone


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
