from django.conf import settings
from django.db import models

from apps.common.models import OrganizationScoped
from apps.orgs.models import NorthMetric


class DailyFocus(OrganizationScoped):
    """
    La métrica norte que el usuario elige al entrar cada día.
    El resto de las métricas se calculan por agregación (sin tabla propia).
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="daily_focuses",
    )
    date = models.DateField()
    metric = models.CharField(max_length=20, choices=NorthMetric.choices)

    class Meta:
        ordering = ["-date"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "date"],
                name="unique_dailyfocus_per_user_per_day",
            )
        ]

    def __str__(self) -> str:
        return f"{self.user_id} {self.date}: {self.metric}"
