"""
Agente Prospector: convierte una petición en lenguaje natural del vendedor
("clínicas dentales en Providencia con buena reputación") en una búsqueda
estructurada sobre OpenStreetMap: un lugar geocodificable + filtros OSM.

Es el paso que diferencia esto de un simple embed de mapa: el usuario habla
en su idioma, el modelo traduce a las etiquetas técnicas de OSM.
"""
from __future__ import annotations

import logging

from django.conf import settings
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class OSMFilter(BaseModel):
    """Un par etiqueta=valor de OpenStreetMap (p. ej. amenity=dentist)."""

    key: str = Field(description="Clave OSM: amenity, shop, office, healthcare, etc.")
    value: str = Field(description="Valor OSM en inglés y en minúsculas, p. ej. 'dentist'.")


class ProspectQuery(BaseModel):
    """Salida estructurada que exigimos al modelo."""

    location: str = Field(
        description="Lugar geocodificable, lo más específico posible, incluyendo "
        "ciudad y país si se pueden inferir. Ej: 'Providencia, Santiago, Chile'."
    )
    filters: list[OSMFilter] = Field(
        description="Uno o más filtros OSM que representen el tipo de negocio buscado."
    )
    label: str = Field(
        description="Resumen corto y humano de lo que se busca, para mostrar en la UI."
    )


_SYSTEM = (
    "Eres un experto en OpenStreetMap y en prospección de ventas. Traduces la "
    "petición de un vendedor a una búsqueda estructurada sobre OSM.\n"
    "REGLAS:\n"
    "1. `location` debe ser geocodificable por Nominatim: incluye ciudad y país "
    "si puedes inferirlos del contexto. Si no hay lugar, usa una ciudad genérica "
    "razonable pero NO inventes direcciones exactas.\n"
    "2. `filters` usa etiquetas OSM reales en inglés minúscula. Ejemplos: "
    "clínica dental -> amenity=dentist; restaurante -> amenity=restaurant; "
    "hotel -> tourism=hotel; ferretería -> shop=hardware; gimnasio -> leisure=fitness_centre; "
    "farmacia -> amenity=pharmacy; colegio -> amenity=school; "
    "constructora/inmobiliaria -> office=company o office=estate_agent; "
    "cafetería -> amenity=cafe; supermercado -> shop=supermarket.\n"
    "3. Si el rubro admite varias etiquetas, incluye las más probables (máx 3).\n"
    "4. Ignora adjetivos de calidad ('con buena reputación', 'grandes'): OSM no "
    "los tiene. Concéntrate en el tipo de negocio y el lugar."
)

_HUMAN = "Petición del vendedor: {text}"


def _llm() -> ChatOpenAI:
    return ChatOpenAI(
        model=settings.OPENAI_CHAT_MODEL,
        api_key=settings.OPENAI_API_KEY,
        temperature=0,
    )


def interpret(text: str) -> ProspectQuery:
    """Texto libre -> búsqueda estructurada (lugar + filtros OSM)."""
    prompt = ChatPromptTemplate.from_messages([("system", _SYSTEM), ("human", _HUMAN)])
    chain = prompt | _llm().with_structured_output(ProspectQuery)
    logger.info("Prospector: interpretando %r", text)
    return chain.invoke({"text": text})


_ANGLE_SYSTEM = (
    "Eres un estratega de ventas B2B en español. Dado un negocio encontrado en el "
    "mapa y la empresa que quiere venderle, redactas un ÁNGULO DE VENTA breve: por "
    "qué este negocio es un buen prospecto y cómo abordar el primer contacto.\n"
    "REGLAS: máximo 3 frases, concreto y accionable, en español, sin saludos ni "
    "encabezados. No inventes datos que no te dieron; razona a partir del rubro y la "
    "zona. Este texto será el 'contexto' que use luego el agente Redactor del mail."
)
_ANGLE_HUMAN = (
    "EMPRESA QUE VENDE: {org_name}. Objetivo de negocio: {org_objetivo}.\n"
    "PROSPECTO ENCONTRADO EN EL MAPA:\n"
    "- Nombre: {name}\n"
    "- Rubro (OSM): {category}\n"
    "- Dirección: {address}\n"
    "Redacta el ángulo de venta."
)


def suggest_angle(
    *, name: str, category: str, address: str, org_name: str, org_objetivo: str
) -> str:
    """Genera un ángulo de venta corto para un prospecto recién traído del mapa.

    Es lo que hace que un lead importado del mapa llegue con contexto útil y no
    vacío. Si el modelo falla, el caller usa un fallback factual.
    """
    prompt = ChatPromptTemplate.from_messages(
        [("system", _ANGLE_SYSTEM), ("human", _ANGLE_HUMAN)]
    )
    chain = prompt | _llm()
    logger.info("Prospector: ángulo de venta para %r", name)
    result = chain.invoke(
        {
            "name": name,
            "category": category or "(sin rubro)",
            "address": address or "(sin dirección)",
            "org_name": org_name,
            "org_objetivo": org_objetivo or "(no especificado)",
        }
    )
    return (result.content or "").strip()
