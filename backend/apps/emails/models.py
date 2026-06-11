from django.conf import settings
from django.db import models

from apps.common.crypto import decrypt, encrypt
from apps.common.models import OrganizationScoped, TimeStampedModel


class EmailAccount(TimeStampedModel):
    """
    Configuración SMTP de envío de una empresa (una por organización).
    Guarda la contraseña CIFRADA. Solo envío.
    """

    organization = models.OneToOneField(
        "orgs.Organization",
        on_delete=models.CASCADE,
        related_name="email_account",
    )
    host = models.CharField(max_length=255, help_text="Ej: smtp.gmail.com")
    port = models.PositiveIntegerField(default=587)
    username = models.CharField(max_length=255, help_text="Usuario SMTP (normalmente el email).")
    password_enc = models.TextField()
    from_email = models.EmailField(help_text="Dirección remitente.")
    from_name = models.CharField(max_length=120, blank=True)
    use_tls = models.BooleanField(default=True, help_text="STARTTLS (puerto 587). Si es 465, usar SSL.")
    configured_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )

    def set_password(self, raw: str) -> None:
        self.password_enc = encrypt(raw)

    def get_password(self) -> str:
        return decrypt(self.password_enc)

    def __str__(self) -> str:
        return f"{self.from_email} ({self.organization_id})"


class EmailMessage(OrganizationScoped):
    """
    Un mail de venta. Lo genera el agente Redactor en estado `borrador`;
    nunca se envía sin aprobación humana (regla dura del proyecto).
    """

    class Status(models.TextChoices):
        DRAFT = "borrador", "Borrador"
        APPROVED = "aprobado", "Aprobado"
        SENT = "enviado", "Enviado"

    lead = models.ForeignKey(
        "pipeline.Lead",
        on_delete=models.CASCADE,
        related_name="emails",
        null=True,
        blank=True,
    )
    to_email = models.EmailField()
    subject = models.CharField(max_length=300)
    body = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    generated_by = models.CharField(
        max_length=50,
        blank=True,
        help_text="Qué agente lo generó (ej. 'redactor'). Vacío si es manual.",
    )
    rationale = models.TextField(
        blank=True,
        help_text="Justificación del agente: por qué redactó así (trazabilidad).",
    )
    gmail_message_id = models.CharField(max_length=120, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"[{self.status}] {self.subject}"
