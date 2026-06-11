"""
Lógica de negocio de organizaciones. Las vistas quedan delgadas; esto se testea
con independencia de HTTP.
"""
from django.db import transaction
from django.utils.text import slugify

from apps.pipeline.models import Stage

from .models import Organization

# Pipeline por defecto que se crea con cada empresa nueva.
# (nombre, orden, is_won, color)
DEFAULT_STAGES: list[tuple[str, int, bool, str]] = [
    ("Leads", 0, False, "#5b8cff"),       # azul
    ("Contactado", 1, False, "#a78bfa"),  # violeta
    ("Reunión", 2, False, "#f59e0b"),     # ámbar
    ("Propuesta", 3, False, "#ec4899"),   # rosa
    ("Cierre", 4, True, "#36d399"),       # verde (ganado)
]


def _unique_slug(name: str) -> str:
    base = slugify(name)[:70] or "empresa"
    slug = base
    i = 2
    while Organization.objects.filter(slug=slug).exists():
        slug = f"{base}-{i}"
        i += 1
    return slug


def create_default_stages(org: Organization) -> None:
    Stage.objects.bulk_create(
        [
            Stage(organization=org, name=name, order=order, is_won=is_won, color=color)
            for name, order, is_won, color in DEFAULT_STAGES
        ]
    )


@transaction.atomic
def create_organization_for_user(
    user,
    *,
    name: str,
    objective: str,
    north_metric: str,
) -> Organization:
    """Crea la empresa, su pipeline por defecto y la asigna al usuario."""
    org = Organization.objects.create(
        name=name,
        slug=_unique_slug(name),
        objective=objective,
        default_north_metric=north_metric,
    )
    create_default_stages(org)
    user.organization = org
    user.save(update_fields=["organization"])
    return org
