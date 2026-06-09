from django.contrib import admin

from .models import Booking, Slot


@admin.register(Slot)
class SlotAdmin(admin.ModelAdmin):
    list_display = ("owner", "title", "date", "time_start", "time_end", "price", "is_active")
    list_filter = ("is_active", "date")
    search_fields = ("owner__username", "title")


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ("slot", "user", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("user__username",)
