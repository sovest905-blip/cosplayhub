from django.contrib import admin

from .models import Shoot, ShootParticipant


class ParticipantInline(admin.TabularInline):
    model = ShootParticipant
    extra = 0
    raw_id_fields = ["user"]


@admin.register(Shoot)
class ShootAdmin(admin.ModelAdmin):
    list_display = ["id", "title", "organizer", "city", "date", "status", "is_active", "created_at"]
    list_filter = ["status", "is_active"]
    search_fields = ["title", "organizer__username", "city"]
    raw_id_fields = ["organizer", "location", "workshop"]
    inlines = [ParticipantInline]
