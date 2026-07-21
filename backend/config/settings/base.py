"""
Settings base. Comunes a todos los entornos.
Los valores sensibles y por-entorno se leen de variables de entorno (.env).
"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent


def env(key: str, default: str | None = None) -> str:
    value = os.environ.get(key, default)
    if value is None:
        raise RuntimeError(f"Falta la variable de entorno requerida: {key}")
    return value


def env_bool(key: str, default: bool = False) -> bool:
    return os.environ.get(key, str(int(default))).lower() in {"1", "true", "yes", "on"}


def env_list(key: str, default: str = "") -> list[str]:
    raw = os.environ.get(key, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


# --- Seguridad ---
SECRET_KEY = env("DJANGO_SECRET_KEY", "insecure-dev-key-cambiar")
DEBUG = env_bool("DJANGO_DEBUG", False)
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")

# --- Apps ---
DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "corsheaders",
]

# Apps del proyecto. Vacías en Fase 0; se llenan en la Fase 1.
LOCAL_APPS = [
    "apps.orgs",
    "apps.accounts",
    "apps.pipeline",
    "apps.emails",
    "apps.agents",
    "apps.metrics",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# --- Base de datos (PostgreSQL) ---
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env("POSTGRES_DB", "ventas"),
        "USER": env("POSTGRES_USER", "ventas"),
        "PASSWORD": env("POSTGRES_PASSWORD", "ventas"),
        "HOST": env("POSTGRES_HOST", "postgres"),
        "PORT": env("POSTGRES_PORT", "5432"),
    }
}

# --- Password validation ---
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# --- Internacionalización ---
LANGUAGE_CODE = "es"
TIME_ZONE = "America/Santiago"
USE_I18N = True
USE_TZ = True

# --- Archivos estáticos ---
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Modelo de usuario propio (definido al inicio del proyecto, según recomienda Django).
AUTH_USER_MODEL = "accounts.User"

# --- DRF ---
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        # JWT para el SPA (Next.js).
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        # Session solo para el admin / browsable API de Django.
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
}

# --- JWT ---
from datetime import timedelta  # noqa: E402

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
}

# --- CORS ---
CORS_ALLOWED_ORIGINS = env_list("CORS_ALLOWED_ORIGINS", "http://localhost:3000")

# --- Celery / Redis ---
REDIS_URL = env("REDIS_URL", "redis://redis:6379/0")
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL
CELERY_TASK_TRACK_STARTED = True
CELERY_TIMEZONE = TIME_ZONE

# Agendas de los agentes automáticos (Fase 6).
from celery.schedules import crontab  # noqa: E402

CELERY_BEAT_SCHEDULE = {
    "coach-diario": {
        "task": "apps.agents.tasks.send_daily_coach",
        "schedule": crontab(hour=8, minute=0),
    },
    "seguimiento-diario": {
        "task": "apps.agents.tasks.run_followups",
        "schedule": crontab(hour=9, minute=0),
    },
}

# --- Servicios externos (se usan desde fases posteriores) ---
QDRANT_URL = env("QDRANT_URL", "http://qdrant:6333")
QDRANT_API_KEY = os.environ.get("QDRANT_API_KEY")
QDRANT_COLLECTION = "knowledge"
# Dimensión del vector según el modelo de embeddings (text-embedding-3-small = 1536).
EMBEDDING_DIM = 1536

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
OPENAI_CHAT_MODEL = os.environ.get("OPENAI_CHAT_MODEL", "gpt-4o-mini")
OPENAI_EMBEDDING_MODEL = os.environ.get("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")

# --- Prospección en mapa (OpenStreetMap, sin API key) ---
# Nominatim geocodifica el lugar ("Providencia") a una bbox; Overpass busca los
# negocios dentro de ella. Ambos servicios públicos piden un User-Agent propio y
# limitan a ~1 req/s: para producción real conviene apuntar a instancias propias.
NOMINATIM_URL = os.environ.get("NOMINATIM_URL", "https://nominatim.openstreetmap.org/search")
OVERPASS_URL = os.environ.get("OVERPASS_URL", "https://overpass-api.de/api/interpreter")
OSM_USER_AGENT = os.environ.get("OSM_USER_AGENT", "ventas-crm/1.0 (prospeccion)")

# --- Google / Gmail OAuth (Fase 5) ---
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
GOOGLE_OAUTH_REDIRECT_URI = os.environ.get(
    "GOOGLE_OAUTH_REDIRECT_URI",
    "http://localhost:8000/api/accounts/gmail/callback/",
)
# Solo envío (mínimo permiso). NO se lee el buzón.
# openid + userinfo.email: solo para saber qué casilla se conectó (no da acceso al correo).
GMAIL_SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/gmail.send",
]
# A dónde vuelve el navegador tras conectar (frontend).
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

# --- Logging estructurado a consola ---
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {"format": "[{levelname}] {asctime} {name}: {message}", "style": "{"},
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "verbose"},
    },
    "root": {"handlers": ["console"], "level": "INFO"},
}
