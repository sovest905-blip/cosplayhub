from django.contrib import admin
from .models import Event


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ("title", "date", "city", "going", "is_published")
    list_filter = ("is_published", "city")
    search_fields = ("title", "city", "place")
