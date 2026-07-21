"""
Búsqueda de negocios sobre OpenStreetMap (gratis, sin API key).

Dos pasos:
  1. Nominatim geocodifica el lugar ("Providencia, Santiago") a una bounding box.
  2. Overpass busca dentro de esa bbox los nodos/vías que matcheen los filtros
     OSM (p. ej. amenity=dentist) que nos entregó el intérprete de lenguaje.

Devuelve candidatos normalizados (nombre, lat/lng, dirección, teléfono, web).
Todo con timeouts y User-Agent propio, porque ambos servicios públicos limitan.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

_TIMEOUT = 25  # s. Overpass puede ser lento; mejor esperar que fallar en seco.


@dataclass
class Candidate:
    """Un negocio encontrado en el mapa, todavía NO guardado como lead."""

    name: str
    lat: float
    lon: float
    address: str = ""
    phone: str = ""
    website: str = ""
    category: str = ""

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "lat": self.lat,
            "lon": self.lon,
            "address": self.address,
            "phone": self.phone,
            "website": self.website,
            "category": self.category,
        }


@dataclass
class SearchResult:
    """Resultado completo: dónde centrar el mapa + los candidatos."""

    center: tuple[float, float] | None
    bbox: list[float] | None  # [south, north, west, east]
    candidates: list[Candidate] = field(default_factory=list)


def _headers() -> dict:
    return {"User-Agent": settings.OSM_USER_AGENT}


def geocode(place: str) -> tuple[tuple[float, float], list[float]] | None:
    """Lugar -> (centro (lat, lon), bbox [south, north, west, east])."""
    try:
        res = requests.get(
            settings.NOMINATIM_URL,
            params={"q": place, "format": "json", "limit": 1},
            headers=_headers(),
            timeout=_TIMEOUT,
        )
        res.raise_for_status()
        data = res.json()
    except (requests.RequestException, ValueError) as exc:
        logger.warning("Nominatim falló para %r: %s", place, exc)
        return None

    if not data:
        return None

    hit = data[0]
    # Nominatim devuelve boundingbox como [south, north, west, east] (strings).
    south, north, west, east = (float(x) for x in hit["boundingbox"])
    center = (float(hit["lat"]), float(hit["lon"]))
    return center, [south, north, west, east]


def _build_overpass_query(filters: list[dict], bbox: list[float]) -> str:
    """Arma la consulta Overpass QL para todos los filtros dentro de la bbox."""
    south, north, west, east = bbox
    bbox_str = f"({south},{west},{north},{east})"
    blocks: list[str] = []
    for f in filters:
        key, value = f.get("key"), f.get("value")
        if not key or not value:
            continue
        tag = f'["{key}"="{value}"]'
        # node, way y relation: los negocios a veces son un polígono, no un punto.
        blocks.append(f"node{tag}{bbox_str};")
        blocks.append(f"way{tag}{bbox_str};")
        blocks.append(f"relation{tag}{bbox_str};")
    body = "".join(blocks)
    # `out center` nos da un lat/lon representativo también para way/relation.
    return f"[out:json][timeout:25];({body});out center tags 60;"


def _compose_address(tags: dict) -> str:
    parts = [
        tags.get("addr:street", ""),
        tags.get("addr:housenumber", ""),
        tags.get("addr:city", ""),
    ]
    return " ".join(p for p in parts if p).strip()


def _element_to_candidate(el: dict) -> Candidate | None:
    tags = el.get("tags", {})
    name = tags.get("name")
    if not name:
        return None  # sin nombre no sirve como lead

    if el.get("type") == "node":
        lat, lon = el.get("lat"), el.get("lon")
    else:  # way / relation -> usa el center calculado por Overpass
        center = el.get("center", {})
        lat, lon = center.get("lat"), center.get("lon")
    if lat is None or lon is None:
        return None

    return Candidate(
        name=name,
        lat=lat,
        lon=lon,
        address=_compose_address(tags),
        phone=tags.get("phone") or tags.get("contact:phone", ""),
        website=tags.get("website") or tags.get("contact:website", ""),
        category=tags.get("amenity") or tags.get("shop") or tags.get("office", ""),
    )


def search(place: str, filters: list[dict], limit: int = 40) -> SearchResult:
    """Geocodifica el lugar y busca los negocios que matcheen los filtros."""
    geo = geocode(place)
    if geo is None:
        return SearchResult(center=None, bbox=None, candidates=[])
    center, bbox = geo

    query = _build_overpass_query(filters, bbox)
    if not query or "();" in query:
        return SearchResult(center=center, bbox=bbox, candidates=[])

    try:
        res = requests.post(
            settings.OVERPASS_URL,
            data={"data": query},
            headers=_headers(),
            timeout=_TIMEOUT,
        )
        res.raise_for_status()
        elements = res.json().get("elements", [])
    except (requests.RequestException, ValueError) as exc:
        logger.warning("Overpass falló para %r: %s", place, exc)
        return SearchResult(center=center, bbox=bbox, candidates=[])

    seen: set[tuple[str, float, float]] = set()
    candidates: list[Candidate] = []
    for el in elements:
        cand = _element_to_candidate(el)
        if cand is None:
            continue
        key = (cand.name, round(cand.lat, 5), round(cand.lon, 5))
        if key in seen:
            continue
        seen.add(key)
        candidates.append(cand)
        if len(candidates) >= limit:
            break

    return SearchResult(center=center, bbox=bbox, candidates=candidates)
