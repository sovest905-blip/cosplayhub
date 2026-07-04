from django.contrib import admin

from .models import CuratedPick, Category


@admin.register(CuratedPick)
class CuratedPickAdmin(admin.ModelAdmin):
    list_display = ("title", "style", "order", "is_active", "created_at")
    list_filter = ("style", "is_active")
    list_editable = ("order", "is_active")
    search_fields = ("title", "tag", "meta")


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("label", "order", "is_active")
    list_filter = ("is_active",)
    list_editable = ("order", "is_active")
    search_fields = ("label",)
