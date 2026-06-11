"""
RAG: convierte texto en vectores (embeddings de OpenAI) y orquesta el
indexado y la recuperación sobre Qdrant. Esta es la "memoria" de la empresa.
"""
from __future__ import annotations

import logging

from django.conf import settings
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

from apps.agents.models import KnowledgeDoc

from . import vectorstore

logger = logging.getLogger(__name__)

_embeddings: OpenAIEmbeddings | None = None
_splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=120)


def get_embeddings() -> OpenAIEmbeddings:
    global _embeddings
    if _embeddings is None:
        _embeddings = OpenAIEmbeddings(
            model=settings.OPENAI_EMBEDDING_MODEL,
            api_key=settings.OPENAI_API_KEY,
        )
    return _embeddings


def index_document(doc: KnowledgeDoc) -> int:
    """Chunkea, embebe e indexa un KnowledgeDoc. Devuelve cantidad de chunks."""
    chunks = _splitter.split_text(doc.content)
    if not chunks:
        return 0
    vectors = get_embeddings().embed_documents(chunks)
    vectorstore.upsert_chunks(
        organization_id=doc.organization_id,
        doc_id=doc.id,
        doc_type=doc.doc_type,
        title=doc.title,
        chunks=chunks,
        vectors=vectors,
    )
    KnowledgeDoc.objects.filter(pk=doc.pk).update(is_indexed=True)
    logger.info("Doc %d indexado (%d chunks)", doc.id, len(chunks))
    return len(chunks)


def retrieve(*, organization_id: int, query: str, k: int = 4) -> list[dict]:
    """Recupera los chunks más relevantes de la empresa para una consulta."""
    query_vector = get_embeddings().embed_query(query)
    hits = vectorstore.search(
        organization_id=organization_id, query_vector=query_vector, k=k
    )
    logger.info("RAG: %d chunks recuperados para org %d", len(hits), organization_id)
    return hits
