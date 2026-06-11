from django.contrib import admin
from .models import Guide, GuidePhoto


@admin.register(Guide)
class GuideAdmin(admin.ModelAdmin):
    list_display = ("title", "category", "is_published", "created_at")
    list_filter = ("is_published", "category")
    search_fields = ("title", "summary", "body")


admin.site.register(GuidePhoto)
