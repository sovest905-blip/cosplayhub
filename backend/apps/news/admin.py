from django.contrib import admin
from .models import News


@admin.register(News)
class NewsAdmin(admin.ModelAdmin):
    list_display = ("title", "is_pinned", "is_published", "created_at")
    list_filter = ("is_pinned", "is_published")
    search_fields = ("title", "body")
