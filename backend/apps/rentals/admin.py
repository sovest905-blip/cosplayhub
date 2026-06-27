from django.contrib import admin

from .models import Costume, RentalRequest


class RequestInline(admin.TabularInline):
    model = RentalRequest
    extra = 0
    raw_id_fields = ["user"]


@admin.register(Costume)
class CostumeAdmin(admin.ModelAdmin):
    list_display = ["id", "title", "owner", "city", "price_day", "status", "is_active", "created_at"]
    list_filter = ["status", "is_active"]
    search_fields = ["title", "character", "owner__username", "city"]
    raw_id_fields = ["owner"]
    inlines = [RequestInline]
