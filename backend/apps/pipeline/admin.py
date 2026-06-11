from django.contrib import admin

from .models import Activity, Contact, Lead, Stage


class ContactInline(admin.TabularInline):
    model = Contact
    extra = 0


class ActivityInline(admin.TabularInline):
    model = Activity
    extra = 0
    readonly_fields = ("created_at",)


@admin.register(Stage)
class StageAdmin(admin.ModelAdmin):
    list_display = ("name", "organization", "order", "is_won")
    list_filter = ("organization", "is_won")
    ordering = ("organization", "order")


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ("name", "company", "stage", "organization", "owner", "created_at")
    list_filter = ("organization", "stage", "source")
    search_fields = ("name", "company")
    inlines = [ContactInline, ActivityInline]


@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ("name", "email", "role", "lead", "organization")
    search_fields = ("name", "email")


@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    list_display = ("kind", "lead", "actor", "organization", "created_at")
    list_filter = ("organization", "kind")
    readonly_fields = ("created_at", "updated_at")
