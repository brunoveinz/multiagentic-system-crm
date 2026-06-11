"""
Agente Coach de ventas. Cada día le hace UNA pregunta al vendedor para que
reflexione sobre cómo vender más. Las respuestas se guardan (DB) y se embeben
en Qdrant (colección propia) para darle MEMORIA: el coach recuerda lo que
dijiste y le da seguimiento.
"""
from __future__ import annotations

import logging
import uuid
from datetime import date

from django.conf import settings
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from qdrant_client import models

from apps.agents.models import ChatMessage, CoachingLog
from apps.orgs.models import NorthMetric

from .rag import get_embeddings
from .vectorstore import get_client

logger = logging.getLogger(__name__)

COACH_COLLECTION = "coaching"


def _ensure_collection() -> None:
    client = get_client()
    if client.collection_exists(COACH_COLLECTION):
        return
    try:
        client.create_collection(
            collection_name=COACH_COLLECTION,
            vectors_config=models.VectorParams(
                size=settings.EMBEDDING_DIM, distance=models.Distance.COSINE
            ),
        )
    except Exception:
        if not client.collection_exists(COACH_COLLECTION):
            raise


def _index(*, organization_id: int, user_id: int, text: str) -> None:
    """Embebe un texto en la memoria del coach (Qdrant)."""
    _ensure_collection()
    vector = get_embeddings().embed_query(text)
    get_client().upsert(
        collection_name=COACH_COLLECTION,
        points=[
            models.PointStruct(
                id=str(uuid.uuid4()),
                vector=vector,
                payload={
                    "organization_id": organization_id,
                    "user_id": user_id,
                    "text": text,
                },
            )
        ],
    )


def remember(log: CoachingLog) -> None:
    """Embebe la respuesta del vendedor en Qdrant (memoria del coach)."""
    if not log.answer.strip():
        return
    _index(
        organization_id=log.organization_id,
        user_id=log.user_id,
        text=f"P: {log.question}\nR: {log.answer}",
    )
    CoachingLog.objects.filter(pk=log.pk).update(is_indexed=True)
    logger.info("Coach: respuesta del usuario %d indexada", log.user_id)


def recall(*, user_id: int, query: str, k: int = 3) -> list[str]:
    """Recupera respuestas pasadas del vendedor (su memoria de coaching)."""
    client = get_client()
    if not client.collection_exists(COACH_COLLECTION):
        return []
    result = client.query_points(
        collection_name=COACH_COLLECTION,
        query=get_embeddings().embed_query(query),
        query_filter=models.Filter(
            must=[
                models.FieldCondition(
                    key="user_id", match=models.MatchValue(value=user_id)
                )
            ]
        ),
        limit=k,
        with_payload=True,
    )
    return [p.payload["text"] for p in result.points]


def _instructions(org) -> str:
    return org.coach_instructions.strip() or "(sin instrucciones específicas de la empresa)"


_SYSTEM_QUESTION = (
    "Eres el coach de ventas de la empresa. Hablas en español, directo y breve.\n"
    "Instrucciones de la empresa sobre cómo ayudar a vender:\n{instructions}\n\n"
    "Generas UNA sola pregunta de coaching para hoy (1-2 frases), concreta y accionable, "
    "orientada a la métrica norte: {metric}. Si hay historial, dale seguimiento a lo anterior."
)


def _llm(temperature: float) -> ChatOpenAI:
    return ChatOpenAI(
        model=settings.OPENAI_CHAT_MODEL,
        api_key=settings.OPENAI_API_KEY,
        temperature=temperature,
    )


def generate_question(user) -> str:
    history = recall(user_id=user.id, query="objetivos, avances y trabas para vender más", k=3)
    history_text = "\n".join(history) if history else "(sin historial todavía)"
    org = user.organization

    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", _SYSTEM_QUESTION),
            ("human", "Historial reciente:\n{history}\n\nTu pregunta de hoy:"),
        ]
    )
    chain = prompt | _llm(0.8)
    return chain.invoke(
        {
            "instructions": _instructions(org),
            "metric": NorthMetric(org.default_north_metric).label,
            "history": history_text,
        }
    ).content.strip()


_SYSTEM_CHAT = (
    "Eres el coach de ventas de la empresa, un asesor experto que ayuda al vendedor a cerrar "
    "más negocios. Hablas en español, concreto y accionable.\n"
    "Empresa: {org_name}. Objetivo: {objetivo}. Métrica norte: {metric}.\n"
    "Instrucciones de la empresa sobre cómo ayudar a vender:\n{instructions}\n\n"
    "Memoria de conversaciones/coaching previos del vendedor:\n{memory}"
)


def chat(user, message: str) -> str:
    """
    Conversación con el coach. El historial se persiste en DB (memoria de hilo)
    y cada intercambio se indexa en Qdrant (memoria semántica de largo plazo).
    """
    org = user.organization
    recent = list(
        ChatMessage.objects.filter(user=user).order_by("-created_at")[:10]
    )[::-1]
    memory = recall(user_id=user.id, query=message, k=3)
    memory_text = "\n".join(memory) if memory else "(sin memoria todavía)"

    # Mensajes directos (sin plantillas) para no romper con el texto libre del usuario.
    messages: list = [
        SystemMessage(
            content=_SYSTEM_CHAT.format(
                org_name=org.name,
                objetivo=org.objective or "(no especificado)",
                metric=NorthMetric(org.default_north_metric).label,
                instructions=_instructions(org),
                memory=memory_text,
            )
        )
    ]
    for msg in recent:
        if msg.role == ChatMessage.Role.ASSISTANT:
            messages.append(AIMessage(content=msg.content))
        else:
            messages.append(HumanMessage(content=msg.content))
    messages.append(HumanMessage(content=message))

    reply = _llm(0.7).invoke(messages).content.strip()

    ChatMessage.objects.create(
        organization=org, user=user, role=ChatMessage.Role.USER, content=message
    )
    ChatMessage.objects.create(
        organization=org, user=user, role=ChatMessage.Role.ASSISTANT, content=reply
    )
    _index(
        organization_id=org.id,
        user_id=user.id,
        text=f"Usuario: {message}\nCoach: {reply}",
    )
    return reply


def chat_history(user) -> list[ChatMessage]:
    return list(ChatMessage.objects.filter(user=user).order_by("created_at"))


def get_or_create_today(user) -> CoachingLog:
    log, created = CoachingLog.objects.get_or_create(
        user=user,
        date=date.today(),
        defaults={"organization": user.organization, "question": ""},
    )
    if created or not log.question:
        log.question = generate_question(user)
        log.save(update_fields=["question"])
    return log


def save_answer(user, answer: str) -> CoachingLog:
    log = get_or_create_today(user)
    log.answer = answer
    log.save(update_fields=["answer"])
    remember(log)
    log.refresh_from_db()  # toma el is_indexed actualizado por remember()
    return log
