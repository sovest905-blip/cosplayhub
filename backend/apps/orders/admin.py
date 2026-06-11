from django.contrib import admin
from .models import Order, Review
admin.site.register(Order)


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("workshop", "author", "rating", "created_at")
    list_filter = ("rating",)
    search_fields = ("workshop__name", "author__username", "text")
