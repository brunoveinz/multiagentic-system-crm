import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")

app = Celery("ventas")
# Toma toda la config CELERY_* desde settings de Django.
app.config_from_object("django.conf:settings", namespace="CELERY")
# Descubre tasks.py en cada app instalada.
app.autodiscover_tasks()
