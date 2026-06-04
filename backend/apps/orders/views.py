from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Order
from .serializers import OrderSerializer

class OrderViewSet(viewsets.ModelViewSet):
    """Заказы. Каждый видит ТОЛЬКО свои (как заказчик).
    ИБ: queryset фильтруется по request.user — нельзя прочитать чужой заказ."""
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(customer=self.request.user).select_related("workshop")

    def perform_create(self, serializer):
        serializer.save(customer=self.request.user)
