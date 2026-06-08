from django.contrib import admin
from .models import Moodboard, MoodboardItem


class ItemInline(admin.TabularInline):
    model = MoodboardItem
    extra = 0


@admin.register(Moodboard)
class MoodboardAdmin(admin.ModelAdmin):
    list_display = ("title", "owner", "is_public", "is_active", "created_at")
    list_filter = ("is_public", "is_active")
    search_fields = ("title", "owner__username")
    inlines = [ItemInline]
