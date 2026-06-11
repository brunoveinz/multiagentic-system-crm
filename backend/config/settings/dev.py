"""Settings de desarrollo."""
from .base import *  # noqa: F401,F403
from .base import ALLOWED_HOSTS

DEBUG = True

# Útil para acceder desde el navegador del host vía el contenedor.
ALLOWED_HOSTS = ALLOWED_HOSTS + ["*"] if "*" not in ALLOWED_HOSTS else ALLOWED_HOSTS
