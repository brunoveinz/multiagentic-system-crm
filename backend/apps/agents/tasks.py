import logging
from collections import defaultdict

from celery import shared_task
from django.conf import settings
from django.contrib.auth import get_user_model

from apps.emails.models import EmailAccount
from apps.emails.services import smtp
from apps.orgs.models import Organization

from .models import KnowledgeDoc
from .services import coach, followups
from .services.rag import index_document

logger = logging.getLogger(__name__)
User = get_user_model()


@shared_task
def index_knowledge_doc(doc_id: int) -> None:
    """Indexa un documento en Qdrant de forma asíncrona (embeddings = costo/tiempo)."""
    try:
        doc = KnowledgeDoc.objects.get(pk=doc_id)
    except KnowledgeDoc.DoesNotExist:
        logger.warning("index_knowledge_doc: doc %d no existe", doc_id)
        return
    index_document(doc)


def _account_for(org) -> EmailAccount | None:
    return EmailAccount.objects.filter(organization=org).first()


@shared_task
def send_daily_coach() -> None:
    """Cada día: genera la pregunta de coaching por usuario y se la envía por mail."""
    link = f"{settings.FRONTEND_URL}/app?view=coach"
    for user in User.objects.filter(organization__isnull=False, is_active=True):
        try:
            log = coach.get_or_create_today(user)
            account = _account_for(user.organization)
            if account and user.email:
                smtp.send_message(
                    account=account,
                    to=user.email,
                    subject="🎯 Tu coaching de ventas de hoy",
                    body=f"{log.question}\n\nResponde aquí: {link}",
                )
                logger.info("Coach: mail enviado a %s", user.email)
        except Exception:
            logger.exception("Coach: fallo para el usuario %s", user.id)


@shared_task
def run_followups() -> None:
    """Cada día: avisa por mail a cada vendedor sobre sus leads estancados."""
    for org in Organization.objects.all():
        account = _account_for(org)
        leads = followups.stale_leads(org)
        if not leads:
            continue
        if not account:
            logger.info("Seguimiento: org %s tiene %d leads estancados (sin SMTP)", org.id, len(leads))
            continue

        by_owner: dict = defaultdict(list)
        for lead in leads:
            if lead.owner and lead.owner.email:
                by_owner[lead.owner].append(lead)

        for owner, owner_leads in by_owner.items():
            lines = [
                f"- {lead.name} ({lead.stage.name}): {followups.days_since_activity(lead)} días sin actividad"
                for lead in owner_leads
            ]
            body = "Estos leads necesitan seguimiento:\n\n" + "\n".join(lines)
            try:
                smtp.send_message(
                    account=account,
                    to=owner.email,
                    subject=f"🔔 {len(owner_leads)} leads necesitan seguimiento",
                    body=body,
                )
                logger.info("Seguimiento: mail enviado a %s", owner.email)
            except Exception:
                logger.exception("Seguimiento: fallo enviando a %s", owner.email)
