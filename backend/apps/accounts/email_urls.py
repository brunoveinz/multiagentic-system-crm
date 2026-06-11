"""Config de correo (SMTP) de la empresa, montada en /api/accounts/."""
from django.urls import path

from .views import EmailAccountView

urlpatterns = [
    path("email/", EmailAccountView.as_view(), name="email_account"),
]
