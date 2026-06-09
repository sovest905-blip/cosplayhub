from django.contrib import admin
from .models import Product


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("title", "owner", "price", "status", "is_active", "created_at")
    list_filter = ("status", "is_active")
    search_fields = ("title", "owner__username")
