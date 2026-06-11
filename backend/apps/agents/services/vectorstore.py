"""
Capa explícita sobre Qdrant. Una sola colección `knowledge` multi-tenant:
cada punto lleva en su payload el `organization_id`, y las búsquedas se filtran
por esa empresa. Así un org nunca ve el conocimiento de otro.
"""
from __future__ import annotations

import logging
import uuid

from django.conf import settings
from qdrant_client import QdrantClient, models

logger = logging.getLogger(__name__)

_client: QdrantClient | None = None


def get_client() -> QdrantClient:
    global _client
    if _client is None:
        _client = QdrantClient(url=settings.QDRANT_URL, api_key=settings.QDRANT_API_KEY)
    return _client


def ensure_collection() -> None:
    """Crea la colección si no existe (idempotente y a prueba de carreras)."""
    client = get_client()
    if client.collection_exists(settings.QDRANT_COLLECTION):
        return
    try:
        client.create_collection(
            collection_name=settings.QDRANT_COLLECTION,
            vectors_config=models.VectorParams(
                size=settings.EMBEDDING_DIM,
                distance=models.Distance.COSINE,
            ),
        )
        logger.info("Colección Qdrant '%s' creada", settings.QDRANT_COLLECTION)
    except Exception:
        # Otra tarea concurrente pudo crearla entre el check y el create.
        if not client.collection_exists(settings.QDRANT_COLLECTION):
            raise


def _org_filter(organization_id: int) -> models.Filter:
    return models.Filter(
        must=[
            models.FieldCondition(
                key="organization_id",
                match=models.MatchValue(value=organization_id),
            )
        ]
    )


def upsert_chunks(
    *,
    organization_id: int,
    doc_id: int,
    doc_type: str,
    title: str,
    chunks: list[str],
    vectors: list[list[float]],
) -> None:
    """Indexa los chunks de un documento (reemplazando los previos del doc)."""
    ensure_collection()
    delete_document(doc_id)
    points = [
        models.PointStruct(
            id=str(uuid.uuid4()),
            vector=vector,
            payload={
                "organization_id": organization_id,
                "doc_id": doc_id,
                "doc_type": doc_type,
                "title": title,
                "text": chunk,
            },
        )
        for chunk, vector in zip(chunks, vectors, strict=True)
    ]
    get_client().upsert(collection_name=settings.QDRANT_COLLECTION, points=points)
    logger.info("Indexados %d chunks del doc %d", len(points), doc_id)


def delete_document(doc_id: int) -> None:
    """Borra todos los chunks de un documento del índice."""
    if not get_client().collection_exists(settings.QDRANT_COLLECTION):
        return
    get_client().delete(
        collection_name=settings.QDRANT_COLLECTION,
        points_selector=models.FilterSelector(
            filter=models.Filter(
                must=[
                    models.FieldCondition(
                        key="doc_id", match=models.MatchValue(value=doc_id)
                    )
                ]
            )
        ),
    )


def search(
    *, organization_id: int, query_vector: list[float], k: int = 4
) -> list[dict]:
    """Top-k chunks más parecidos, restringidos a la empresa."""
    if not get_client().collection_exists(settings.QDRANT_COLLECTION):
        return []
    result = get_client().query_points(
        collection_name=settings.QDRANT_COLLECTION,
        query=query_vector,
        query_filter=_org_filter(organization_id),
        limit=k,
        with_payload=True,
    )
    return [
        {
            "title": point.payload.get("title", ""),
            "doc_type": point.payload.get("doc_type", ""),
            "text": point.payload.get("text", ""),
            "score": point.score,
        }
        for point in result.points
    ]
