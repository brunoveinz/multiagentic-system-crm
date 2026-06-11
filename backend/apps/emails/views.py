import logging

from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from apps.common.permissions import HasOrganization
from apps.pipeline.models import Activity

from .models import EmailAccount, EmailMessage
from .serializers import EmailMessageSerializer, EmailUpdateSerializer
from .services import smtp

logger = logging.getLogger(__name__)


class EmailMessageViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """
    Mails de la empresa. Flujo human-in-the-loop:
    borrador → (editar) → aprobar → enviar. No se crea ni borra desde aquí.
    """

    permission_classes = [IsAuthenticated, HasOrganization]
    queryset = EmailMessage.objects.select_related("lead")

    def get_queryset(self):
        qs = self.queryset.filter(organization=self.request.user.organization)
        lead = self.request.query_params.get("lead")
        return qs.filter(lead_id=lead) if lead else qs

    def get_serializer_class(self):
        if self.action in {"update", "partial_update"}:
            return EmailUpdateSerializer
        return EmailMessageSerializer

    def update(self, request, *args, **kwargs):
        email = self.get_object()
        if email.status != EmailMessage.Status.DRAFT:
            return Response(
                {"detail": "Solo se puede editar un borrador."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().update(request, *args, **kwargs)

    @action(detail=True, methods=["post"])
    def approve(self, request: Request, pk: str | None = None) -> Response:
        email = self.get_object()
        if email.status != EmailMessage.Status.DRAFT:
            return Response(
                {"detail": "Solo se aprueba un borrador."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        email.status = EmailMessage.Status.APPROVED
        email.save(update_fields=["status", "updated_at"])
        return Response(EmailMessageSerializer(email).data)

    @action(detail=True, methods=["post"])
    def send(self, request: Request, pk: str | None = None) -> Response:
        email = self.get_object()
        if email.status != EmailMessage.Status.APPROVED:
            return Response(
                {"detail": "Debes aprobar el borrador antes de enviarlo."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not email.to_email:
            return Response(
                {"detail": "El mail no tiene destinatario."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        account = EmailAccount.objects.filter(
            organization=request.user.organization
        ).first()
        if not account:
            return Response(
                {"detail": "Configura el correo (SMTP) de tu empresa antes de enviar."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            message_id = smtp.send_message(
                account=account,
                to=email.to_email,
                subject=email.subject,
                body=email.body,
            )
        except Exception:
            logger.exception("Fallo al enviar el mail %d", email.id)
            return Response(
                {"detail": "No se pudo enviar el correo. Revisa la configuración SMTP."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        email.status = EmailMessage.Status.SENT
        email.gmail_message_id = message_id
        email.sent_at = timezone.now()
        email.save(update_fields=["status", "gmail_message_id", "sent_at", "updated_at"])

        if email.lead_id:
            Activity.objects.create(
                organization=email.organization,
                lead=email.lead,
                kind=Activity.Kind.EMAIL_SENT,
                description=f"Mail enviado a {email.to_email}: {email.subject}",
                actor=request.user,
            )
        return Response(EmailMessageSerializer(email).data)
