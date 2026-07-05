from django.contrib import admin

from .models import DailyVisit


@admin.register(DailyVisit)
class DailyVisitAdmin(admin.ModelAdmin):
    list_display = ("date", "count")
    ordering = ("-date",)
