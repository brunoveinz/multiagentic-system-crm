from django.db import models

from apps.common.models import TimeStampedModel


class NorthMetric(models.TextChoices):
    """La métrica más valiosa que el usuario elige perseguir."""

    MAILS = "mails", "Enviar más mails"
    MEETINGS = "reuniones", "Agendar más reuniones"
    DEALS = "cierres", "Concretar más negocios"


class Organization(TimeStampedModel):
    """
    Una empresa/proyecto. Es el nodo del que cuelga todo (multi-tenant).
    La crea el usuario en el onboarding (Fase 2).
    """

    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=80, unique=True)
    objective = models.TextField(
        blank=True,
        help_text="Qué quiere lograr esta empresa con sus ventas.",
    )
    default_north_metric = models.CharField(
        max_length=20,
        choices=NorthMetric.choices,
        default=NorthMetric.MAILS,
    )
    coach_instructions = models.TextField(
        blank=True,
        help_text="Instrucciones que se inyectan al Coach para que sepa cómo ayudar a vender.",
    )

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name
