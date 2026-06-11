from django.contrib import admin

from .models import EmailAccount, EmailMessage


@admin.register(EmailAccount)
class EmailAccountAdmin(admin.ModelAdmin):
    list_display = ("from_email", "host", "organization", "configured_by", "created_at")
    readonly_fields = ("password_enc", "created_at", "updated_at")


@admin.register(EmailMessage)
class EmailMessageAdmin(admin.ModelAdmin):
    list_display = ("subject", "to_email", "status", "lead", "generated_by", "sent_at")
    list_filter = ("organization", "status", "generated_by")
    search_fields = ("subject", "to_email")
    readonly_fields = ("gmail_message_id", "sent_at", "created_at", "updated_at")
