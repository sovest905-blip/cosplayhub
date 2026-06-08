from django.contrib import admin
from .models import Subscription


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ["id", "plan", "user", "workshop", "source", "active_until", "disabled", "status"]
    list_filter = ["plan", "source", "disabled"]
    search_fields = ["user__username", "user__email", "workshop__name", "note"]
    raw_id_fields = ["user", "workshop"]

    @admin.display(description="статус")
    def status(self, obj):
        return obj.status
