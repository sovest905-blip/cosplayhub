from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Invite, User

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ("email", "username", "city", "is_verified", "is_staff")
    search_fields = ("email", "username")
    ordering = ("email",)

@admin.register(Invite)
class InviteAdmin(admin.ModelAdmin):
    list_display = ("code", "note", "used_count", "max_uses", "is_active", "created_by", "created_at")
    search_fields = ("code", "note")
    list_filter = ("is_active",)
