from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.users.backends import CsrfExemptSessionAuthentication
from .models import Order, Review, recalc_workshop_rating
from .serializers import OrderSerializer, IncomingOrderSerializer, ReviewSerializer

class OrderViewSet(viewsets.ModelViewSet):
    """Заказы. Каждый видит ТОЛЬКО свои (как заказчик).
    ИБ: queryset фильтруется по request.user — нельзя прочитать чужой заказ."""
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def get_queryset(self):
        return Order.objects.filter(customer=self.request.user).select_related("workshop")

    def perform_create(self, serializer):
        order = serializer.save(customer=self.request.user)
        # Уведомить владельца мастерской о новой заявке
        from apps.notifications.models import notify
        notify(
            order.workshop.owner, "order_new",
            f"Новая заявка от @{self.request.user.username} в «{order.workshop.name}»",
            url="/cabinet?tab=responses",
        )


class IncomingOrdersView(APIView):
    """Заказы в мастерские текущего пользователя (он — владелец мастерской)."""
    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfExemptSessionAuthentication]

    TRANSITIONS = {
        "request":  ["accepted", "cancelled"],
        "accepted": ["in_work", "cancelled"],
        "in_work":  ["shipped", "cancelled"],
        "shipped":  ["done"],
    }

    def get(self, request):
        orders = (
            Order.objects
            .filter(workshop__owner=request.user)
            .select_related("customer", "workshop")
            .order_by("-created_at")
        )
        return Response(IncomingOrderSerializer(orders, many=True).data)

    def patch(self, request, pk):
        try:
            order = Order.objects.select_related("workshop").get(
                pk=pk, workshop__owner=request.user
            )
        except Order.DoesNotExist:
            return Response({"detail": "Не найдено"}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get("status", "")
        allowed = self.TRANSITIONS.get(order.status, [])
        if new_status not in allowed:
            return Response(
                {"detail": f"Нельзя перевести из «{order.get_status_display()}» в этот статус"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        order.status = new_status
        order.save(update_fields=["status"])
        # Уведомить заказчика о смене статуса
        from apps.notifications.models import notify
        notify(
            order.customer, "order_status",
            f"Заказ в «{order.workshop.name}»: {order.get_status_display()}",
            url="/cabinet?tab=orders",
        )
        return Response(IncomingOrderSerializer(order).data)


class OrderReviewView(APIView):
    """Отзыв по своему завершённому заказу.
    ИБ: заказ ищется только среди заказов request.user — чужой не оценить."""
    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def post(self, request, pk):
        try:
            order = Order.objects.select_related("workshop").get(pk=pk, customer=request.user)
        except Order.DoesNotExist:
            return Response({"detail": "Не найдено"}, status=status.HTTP_404_NOT_FOUND)
        if order.status != "done":
            return Response({"detail": "Отзыв можно оставить после получения заказа"},
                            status=status.HTTP_400_BAD_REQUEST)
        if Review.objects.filter(order=order).exists():
            return Response({"detail": "Отзыв уже оставлен"}, status=status.HTTP_400_BAD_REQUEST)

        ser = ReviewSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        review = ser.save(order=order, workshop=order.workshop, author=request.user)
        recalc_workshop_rating(order.workshop)

        from apps.notifications.models import notify
        notify(
            order.workshop.owner, "review_new",
            f"Новый отзыв ★{review.rating} от @{request.user.username} о «{order.workshop.name}»",
            url=f"/workshops/{order.workshop_id}",
        )
        return Response(ReviewSerializer(review).data, status=status.HTTP_201_CREATED)
