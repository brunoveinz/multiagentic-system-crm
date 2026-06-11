from django.contrib import admin

from .models import DailyFocus


@admin.register(DailyFocus)
class DailyFocusAdmin(admin.ModelAdmin):
    list_display = ("user", "date", "metric", "organization")
    list_filter = ("organization", "metric")
