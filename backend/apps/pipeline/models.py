from django.conf import settings
from django.db import models

from apps.common.models import OrganizationScoped


class Stage(OrganizationScoped):
    """Una columna del Kanban (fase del pipeline). Ordenable por org."""

    name = models.CharField(max_length=120)
    order = models.PositiveIntegerField(default=0)
    color = models.CharField(
        max_length=7,
        default="#5b8cff",
        help_text="Color HEX de la columna en el Kanban.",
    )
    is_won = models.BooleanField(
        default=False,
        help_text="Marca la etapa de cierre ganado (para métricas de conversión).",
    )

    class Meta:
        ordering = ["order", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "order"],
                name="unique_stage_order_per_org",
            )
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.organization_id})"


class Lead(OrganizationScoped):
    """Una empresa/persona a la que se le quiere vender. Carga manual en v1."""

    SOURCE_MANUAL = "manual"
    SOURCE_CHOICES = [(SOURCE_MANUAL, "Carga manual")]

    name = models.CharField(max_length=200, help_text="Empresa o persona.")
    company = models.CharField(max_length=200, blank=True)
    stage = models.ForeignKey(
        Stage,
        on_delete=models.PROTECT,
        related_name="leads",
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="owned_leads",
        help_text="Vendedor responsable.",
    )
    context = models.TextField(
        blank=True,
        help_text="Contexto / ángulo de venta (insumo para el agente Redactor).",
    )
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default=SOURCE_MANUAL)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.name


class Contact(OrganizationScoped):
    """Una persona concreta dentro de un lead (a quién se le escribe)."""

    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name="contacts")
    name = models.CharField(max_length=200)
    email = models.EmailField(blank=True)
    role = models.CharField(max_length=120, blank=True, help_text="Cargo.")
    phone = models.CharField(max_length=40, blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return f"{self.name} <{self.email}>"


class Activity(OrganizationScoped):
    """
    Timeline append-only de un lead: cambios de estado, mails enviados, notas,
    cómo se lo contactó. Nunca se edita, solo se agrega.
    """

    class Kind(models.TextChoices):
        STAGE_CHANGE = "stage_change", "Cambio de etapa"
        EMAIL_SENT = "email_sent", "Mail enviado"
        CONTACT_MADE = "contact_made", "Contacto realizado"
        NOTE = "note", "Nota"

    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name="activities")
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.NOTE)
    description = models.TextField(blank=True)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="activities",
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "Activities"

    def __str__(self) -> str:
        return f"[{self.kind}] {self.lead_id}"
