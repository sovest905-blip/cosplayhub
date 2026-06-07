from django.contrib import admin
from .models import Look, LookLike


@admin.register(Look)
class LookAdmin(admin.ModelAdmin):
    list_display = ("title", "author", "character", "is_published", "created_at")
    list_filter = ("is_published",)
    search_fields = ("title", "character", "author__username")


admin.site.register(LookLike)
