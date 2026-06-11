"""
Agente Redactor: dado un lead + objetivo + tono, recupera conocimiento de la
empresa (RAG) Y el contexto propio del cliente (contacto, ángulo, notas), y
redacta un borrador de mail con salida estructurada.

Human-in-the-loop: NO envía nada. Crea un EmailMessage en estado `borrador`.
"""
from __future__ import annotations

import logging

from django.conf import settings
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

from apps.emails.models import EmailMessage
from apps.pipeline.models import Activity, Lead

from .rag import retrieve

logger = logging.getLogger(__name__)


class EmailDraft(BaseModel):
    """Salida estructurada que exigimos al modelo."""

    subject: str = Field(description="Asunto del correo, breve y atractivo.")
    body: str = Field(description="Cuerpo del correo, en español, listo para enviar.")
    rationale: str = Field(
        description="Por qué se redactó así: ángulo, contexto usado, llamado a la acción."
    )


_SYSTEM = (
    "Eres un redactor experto en ventas B2B en español. Escribes correos en frío "
    "claros, humanos y personalizados, nunca genéricos ni spam.\n"
    "REGLAS ESTRICTAS:\n"
    "1. Dirígete al destinatario por su nombre cuando se proporcione. "
    "NUNCA uses marcadores tipo [Nombre], [Tu Nombre] ni dejes campos por rellenar.\n"
    "2. Apóyate SOLO en el contexto entregado; si falta un dato, omítelo, no lo inventes.\n"
    "3. Firma siempre como {sender_name}, de {org_name}.\n"
    "Objetivo del usuario: {objetivo}. Tono pedido: {tono}."
)

_HUMAN = (
    "EMPRESA QUE VENDE: {org_name}. Objetivo de negocio: {org_objetivo}.\n"
    "REMITENTE (quien firma el correo): {sender_name}.\n\n"
    "DESTINATARIO / CLIENTE:\n"
    "- Persona de contacto: {contact_name}\n"
    "- Empresa del cliente: {lead_company}\n"
    "- Nombre del lead: {lead_name}\n"
    "- Contexto y ángulo de venta de este cliente: {lead_context}\n"
    "- Notas recientes del seguimiento: {client_notes}\n\n"
    "CONOCIMIENTO RELEVANTE DE LA EMPRESA (RAG):\n{context}\n\n"
    "Redacta el correo, ya personalizado y firmado, sin nada por rellenar."
)


def _llm() -> ChatOpenAI:
    return ChatOpenAI(
        model=settings.OPENAI_CHAT_MODEL,
        api_key=settings.OPENAI_API_KEY,
        temperature=0.7,
    )


def _format_context(hits: list[dict]) -> str:
    if not hits:
        return "(sin conocimiento cargado todavía)"
    return "\n".join(f"- [{h['doc_type']}] {h['title']}: {h['text']}" for h in hits)


def _client_notes(lead: Lead) -> str:
    notes = [
        a.description
        for a in lead.activities.all()[:8]
        if a.kind == Activity.Kind.NOTE and a.description and a.description != "Lead creado"
    ]
    return "; ".join(notes) if notes else "(sin notas todavía)"


def draft_email(
    *, lead: Lead, objetivo: str, tono: str, sender_name: str
) -> EmailMessage:
    org = lead.organization
    contact = lead.contacts.first()
    contact_name = contact.name if contact and contact.name else ""

    query = f"{objetivo}. {lead.context} {lead.company}".strip()
    hits = retrieve(organization_id=org.id, query=query, k=4)

    prompt = ChatPromptTemplate.from_messages([("system", _SYSTEM), ("human", _HUMAN)])
    chain = prompt | _llm().with_structured_output(EmailDraft)

    logger.info("Redactor: generando borrador para lead %d", lead.id)
    draft: EmailDraft = chain.invoke(
        {
            "objetivo": objetivo,
            "tono": tono,
            "sender_name": sender_name,
            "org_name": org.name,
            "org_objetivo": org.objective or "(no especificado)",
            "contact_name": contact_name
            or "(nombre desconocido; usa un saludo cordial sin inventar un nombre)",
            "lead_name": lead.name,
            "lead_company": lead.company or "(sin empresa)",
            "lead_context": lead.context or "(sin contexto)",
            "client_notes": _client_notes(lead),
            "context": _format_context(hits),
        }
    )

    email = EmailMessage.objects.create(
        organization=org,
        lead=lead,
        to_email=contact.email if contact else "",
        subject=draft.subject,
        body=draft.body,
        rationale=draft.rationale,
        generated_by="redactor",
        status=EmailMessage.Status.DRAFT,
    )
    logger.info("Redactor: EmailMessage %d creado (borrador)", email.id)
    return email
