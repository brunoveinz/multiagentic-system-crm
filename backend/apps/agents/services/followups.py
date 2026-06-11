"""
Agente de Seguimiento. Detecta leads "estancados" (sin actividad hace varios
días y que no están cerrados) para recordarle al vendedor darles seguimiento.
"""
from __future__ import annotations

from datetime import timedelta

from django.db.models import Max
from django.utils import timezone

from apps.pipeline.models import Lead

STALE_DAYS = 3


def stale_leads(org, days: int = STALE_DAYS) -> list[Lead]:
    """Leads de la empresa sin actividad en `days` días y no ganados."""
    cutoff = timezone.now() - timedelta(days=days)
    leads = (
        Lead.objects.filter(organization=org)
        .exclude(stage__is_won=True)
        .select_related("stage", "owner")
        .annotate(last_act=Max("activities__created_at"))
    )
    result = [lead for lead in leads if (lead.last_act or lead.created_at) < cutoff]
    return result


def days_since_activity(lead: Lead) -> int:
    last = getattr(lead, "last_act", None) or lead.created_at
    return (timezone.now() - last).days
