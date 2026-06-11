# Exponer la app de Celery al importar el paquete `config`,
# para que `@shared_task` y el autodiscover funcionen.
from .celery import app as celery_app

__all__ = ("celery_app",)
