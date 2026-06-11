from django.contrib import admin

from .models import Organization


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "default_north_metric", "created_at")
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}
