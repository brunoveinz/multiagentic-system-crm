"""Settings de producción. Endurece valores; nada de DEBUG."""
from .base import *  # noqa: F401,F403
from .base import MIDDLEWARE, env_list

DEBUG = False

# Whitenoise sirve los estáticos del admin / DRF (justo después de SecurityMiddleware).
MIDDLEWARE.insert(2, "whitenoise.middleware.WhiteNoiseMiddleware")

STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}

# Detrás del proxy de Dokploy (Traefik) que termina TLS.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 60 * 60 * 24 * 7
SECURE_HSTS_INCLUDE_SUBDOMAINS = True

# Orígenes confiables para CSRF (admin). Ej: https://ventas.brunoveinz.com
CSRF_TRUSTED_ORIGINS = env_list("CSRF_TRUSTED_ORIGINS", "")
