from django.contrib import admin

from .models import Battle, BattleEntry, BattleVote


class EntryInline(admin.TabularInline):
    model = BattleEntry
    extra = 0
    raw_id_fields = ["look", "user"]


@admin.register(Battle)
class BattleAdmin(admin.ModelAdmin):
    list_display = ["id", "title", "theme", "starts_at", "ends_at", "is_active", "created_at"]
    list_filter = ["is_active"]
    search_fields = ["title", "theme"]
    raw_id_fields = ["created_by"]
    inlines = [EntryInline]


admin.site.register(BattleVote)
