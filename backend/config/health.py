"""
Endpoint de salud. Verifica conectividad con las dependencias críticas
(Postgres, Redis, Qdrant) para que el healthcheck de Docker tenga sentido.
"""
import urllib.request

import redis
from django.conf import settings
from django.db import connections
from django.http import JsonResponse


def _check_db() -> bool:
    try:
        connections["default"].cursor().execute("SELECT 1")
        return True
    except Exception:
        return False


def _check_redis() -> bool:
    try:
        return bool(redis.Redis.from_url(settings.REDIS_URL).ping())
    except Exception:
        return False


def _check_qdrant() -> bool:
    try:
        with urllib.request.urlopen(f"{settings.QDRANT_URL}/readyz", timeout=3) as resp:
            return resp.status == 200
    except Exception:
        return False


def health(_request) -> JsonResponse:
    checks = {
        "db": _check_db(),
        "redis": _check_redis(),
        "qdrant": _check_qdrant(),
    }
    ok = all(checks.values())
    return JsonResponse(
        {"status": "ok" if ok else "degraded", "services": checks},
        status=200 if ok else 503,
    )
