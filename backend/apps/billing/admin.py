from django.contrib import admin
from .models import Payment, Subscription


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ["id", "plan", "user", "workshop", "source", "active_until", "disabled", "status"]
    list_filter = ["plan", "source", "disabled"]
    search_fields = ["user__username", "user__email", "workshop__name", "note"]
    raw_id_fields = ["user", "workshop"]

    @admin.display(description="статус")
    def status(self, obj):
        return obj.status


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ["id", "purpose", "user", "amount", "currency", "months", "status", "paid_at", "created_at"]
    list_filter = ["purpose", "status", "currency"]
    search_fields = ["order_id", "invoice_uuid", "user__username", "user__email"]
    raw_id_fields = ["user"]
    readonly_fields = ["order_id", "invoice_uuid", "pay_url", "raw", "paid_at", "created_at", "updated_at"]
