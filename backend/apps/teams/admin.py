from django.contrib import admin
from .models import Team, TeamMember, TeamLike


class MemberInline(admin.TabularInline):
    model = TeamMember
    extra = 0


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ("name", "captain", "city", "is_open", "is_active", "created_at")
    list_filter = ("is_open", "is_active")
    search_fields = ("name", "city", "captain__username")
    inlines = [MemberInline]


admin.site.register(TeamLike)
