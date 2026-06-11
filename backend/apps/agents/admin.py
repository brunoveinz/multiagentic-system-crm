from django.contrib import admin

from .models import CoachingLog, KnowledgeDoc


@admin.register(KnowledgeDoc)
class KnowledgeDocAdmin(admin.ModelAdmin):
    list_display = ("title", "doc_type", "organization", "is_indexed", "created_at")
    list_filter = ("organization", "doc_type", "is_indexed")
    search_fields = ("title", "content")


@admin.register(CoachingLog)
class CoachingLogAdmin(admin.ModelAdmin):
    list_display = ("user", "date", "organization", "is_indexed")
    list_filter = ("organization", "is_indexed")
    readonly_fields = ("created_at", "updated_at")
