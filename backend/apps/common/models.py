"""
Modelos base abstractos, reutilizados por todas las apps.
No es una app instalada: solo provee bases abstractas (sin tablas propias).
"""
from django.db import models


class TimeStampedModel(models.Model):
    """Agrega marcas de tiempo de creación/actualización."""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class OrganizationScoped(TimeStampedModel):
    """
    Base para todo lo que pertenece a una empresa (multi-tenant).
    El `related_name` dinámico permite `organization.leads`, `organization.stages`, etc.
    """

    organization = models.ForeignKey(
        "orgs.Organization",
        on_delete=models.CASCADE,
        related_name="%(class)ss",
    )

    class Meta:
        abstract = True
