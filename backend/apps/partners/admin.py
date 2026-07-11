from django.contrib import admin

from .models import Partner


@admin.register(Partner)
class PartnerAdmin(admin.ModelAdmin):
    list_display = ("name", "tier", "show_strip", "show_feed", "is_active", "order")
    list_filter = ("tier", "is_active")
    search_fields = ("name",)
