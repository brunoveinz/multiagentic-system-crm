from django.contrib import admin
from django.urls import include, path

from .health import health

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health, name="health"),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/accounts/", include("apps.accounts.email_urls")),
    path("api/orgs/", include("apps.orgs.urls")),
    path("api/pipeline/", include("apps.pipeline.urls")),
    path("api/agents/", include("apps.agents.urls")),
    path("api/emails/", include("apps.emails.urls")),
    path("api/metrics/", include("apps.metrics.urls")),
]
