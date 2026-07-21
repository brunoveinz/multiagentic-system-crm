"""
Enriquecimiento de contacto SIN APIs de pago: dado el sitio web de un negocio
(el que a veces trae OpenStreetMap), lo visitamos y extraemos email, teléfono y
redes sociales. Prioriza los `mailto:`/`tel:` del HTML (alta precisión) y cae a
un regex sobre el texto visible.

Best-effort y con timeouts cortos: si el sitio no responde o no hay nada, se
devuelve vacío; nunca debe romper el alta del lead.
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from urllib.parse import urljoin, urlparse

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

_TIMEOUT = 6  # s por request; el usuario está esperando el alta.
_MAX_BYTES = 800_000  # no descargamos páginas gigantes.
# Rutas típicas de contacto que probamos además del home. Pocas a propósito:
# cada intento suma latencia al alta y el objetivo es acotar el peor caso.
_CONTACT_PATHS = ("/contacto", "/contact")

_MAILTO_RE = re.compile(r'href=["\']mailto:([^"\'?]+)', re.I)
_TEL_RE = re.compile(r'href=["\']tel:([^"\']+)', re.I)
_EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
_SOCIAL_RE = re.compile(
    r'href=["\'](https?://(?:www\.)?'
    r"(?:facebook|instagram|linkedin|twitter|x|wa\.me|api\.whatsapp)\.com[^\"']*)",
    re.I,
)
# Emails basura frecuentes en el HTML de themes/plugins que NO son del negocio.
_EMAIL_BLOCKLIST = (
    "example.com", "sentry", "wixpress", "@2x", ".png", ".jpg", ".gif",
    "domain.com", "email@", "your@", "yourname", "godaddy", "wordpress",
)


@dataclass
class Enrichment:
    email: str = ""
    phone: str = ""
    socials: list[str] = field(default_factory=list)

    def is_empty(self) -> bool:
        return not (self.email or self.phone or self.socials)


def _fetch(url: str) -> str:
    resp = requests.get(
        url,
        headers={"User-Agent": settings.OSM_USER_AGENT},
        timeout=_TIMEOUT,
        stream=True,
    )
    resp.raise_for_status()
    # Cortamos por tamaño para no leer páginas enormes.
    chunks, total = [], 0
    for chunk in resp.iter_content(chunk_size=16_384, decode_unicode=True):
        if not chunk:
            continue
        chunks.append(chunk if isinstance(chunk, str) else chunk.decode("utf-8", "ignore"))
        total += len(chunk)
        if total >= _MAX_BYTES:
            break
    return "".join(chunks)


def _clean_email(email: str) -> str:
    email = email.strip().strip(".").lower()
    if any(bad in email for bad in _EMAIL_BLOCKLIST):
        return ""
    return email


def _extract(html: str) -> Enrichment:
    result = Enrichment()

    mailtos = [_clean_email(m) for m in _MAILTO_RE.findall(html)]
    mailtos = [m for m in mailtos if m]
    if mailtos:
        result.email = mailtos[0]
    else:
        for m in _EMAIL_RE.findall(html):
            cleaned = _clean_email(m)
            if cleaned:
                result.email = cleaned
                break

    tels = _TEL_RE.findall(html)
    if tels:
        result.phone = re.sub(r"[^\d+]", "", tels[0].strip())[:40]

    seen: set[str] = set()
    for s in _SOCIAL_RE.findall(html):
        base = s.split("?")[0].rstrip("/")
        if base not in seen:
            seen.add(base)
            result.socials.append(base)
        if len(result.socials) >= 4:
            break

    return result


def enrich_from_website(url: str) -> Enrichment:
    """Visita la web del negocio y extrae email/teléfono/redes. Best-effort."""
    if not url:
        return Enrichment()
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    parsed = urlparse(url)
    base = f"{parsed.scheme}://{parsed.netloc}"

    result = Enrichment()
    try:
        result = _extract(_fetch(url))
    except requests.RequestException as exc:
        logger.info("Enriquecimiento: no se pudo leer %s (%s)", url, exc)

    # Si aún falta el email, probamos UNA página de contacto típica.
    if not result.email:
        for path in _CONTACT_PATHS:
            try:
                extra = _extract(_fetch(urljoin(base, path)))
            except requests.RequestException:
                continue
            if extra.email:
                result.email = extra.email
                if not result.phone:
                    result.phone = extra.phone
                if not result.socials:
                    result.socials = extra.socials
                break

    return result
