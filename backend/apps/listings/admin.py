from django.contrib import admin
from .models import Listing

@admin.register(Listing)
class ListingAdmin(admin.ModelAdmin):
    list_display = ["title", "type", "user", "city", "is_active", "created_at"]
    list_filter = ["type", "is_active"]
