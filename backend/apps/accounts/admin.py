from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    # Reutiliza el admin de Django y suma el campo de organización.
    list_display = ("username", "email", "organization", "is_staff")
    fieldsets = BaseUserAdmin.fieldsets + (
        ("Organización", {"fields": ("organization",)}),
    )
