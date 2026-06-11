from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Usuario propio del proyecto. Pertenece a una `Organization` (multi-tenant).
    `organization` es nullable: queda sin asignar hasta que el usuario crea su
    empresa en el onboarding (Fase 2).

    Los tokens OAuth de Gmail se agregan en la Fase 5 (envío de correo).
    """

    organization = models.ForeignKey(
        "orgs.Organization",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="members",
    )

    def __str__(self) -> str:
        return self.get_username()
