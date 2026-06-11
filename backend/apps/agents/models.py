from django.conf import settings
from django.db import models

from apps.common.models import OrganizationScoped


class KnowledgeDoc(OrganizationScoped):
    """
    Pieza de conocimiento de la empresa que alimenta el RAG del Redactor.
    El contenido se chunkea y embebe a Qdrant en la Fase 4.
    """

    class DocType(models.TextChoices):
        PRODUCT = "producto", "Producto / servicio"
        CASE = "caso_exito", "Caso de éxito"
        WINNING_MAIL = "mail_ganador", "Mail ganador"
        OBJECTION = "objecion", "Manejo de objeción"
        OTHER = "otro", "Otro"

    title = models.CharField(max_length=200)
    content = models.TextField()
    doc_type = models.CharField(max_length=20, choices=DocType.choices, default=DocType.OTHER)
    is_indexed = models.BooleanField(
        default=False,
        help_text="True cuando ya está embebido en Qdrant.",
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.title


class ChatMessage(OrganizationScoped):
    """Mensaje de la conversación con el coach. Se persiste e indexa para memoria."""

    class Role(models.TextChoices):
        USER = "user", "Usuario"
        ASSISTANT = "assistant", "Coach"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="coach_messages",
    )
    role = models.CharField(max_length=10, choices=Role.choices)
    content = models.TextField()

    class Meta:
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"{self.role}: {self.content[:40]}"


class CoachingLog(OrganizationScoped):
    """
    Respuesta diaria del usuario al agente Coach (capturada in-app por link).
    Se embebe a Qdrant para darle memoria al coach.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="coaching_logs",
    )
    date = models.DateField()
    question = models.TextField()
    answer = models.TextField(blank=True)
    is_indexed = models.BooleanField(default=False)

    class Meta:
        ordering = ["-date"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "date"],
                name="unique_coachinglog_per_user_per_day",
            )
        ]

    def __str__(self) -> str:
        return f"Coaching {self.user_id} {self.date}"
