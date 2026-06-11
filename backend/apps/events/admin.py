from django.contrib import admin
from .models import Event, EventAttendee


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ("title", "date", "city", "going", "is_published")
    list_filter = ("is_published", "city")
    search_fields = ("title", "city", "place")


@admin.register(EventAttendee)
class EventAttendeeAdmin(admin.ModelAdmin):
    list_display = ("event", "user", "created_at")
    search_fields = ("event__title", "user__username")
