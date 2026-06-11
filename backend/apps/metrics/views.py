from django.db.models import Count
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.agents.services.followups import stale_leads
from apps.common.permissions import HasOrganization
from apps.emails.models import EmailMessage
from apps.pipeline.models import Stage


class DashboardView(APIView):
    """Métricas agregadas de la empresa para el dashboard."""

    permission_classes = [IsAuthenticated, HasOrganization]

    def get(self, request: Request) -> Response:
        org = request.user.organization

        stages = (
            Stage.objects.filter(organization=org)
            .order_by("order", "id")
            .annotate(count=Count("leads"))
        )
        by_stage = [
            {
                "id": s.id,
                "name": s.name,
                "color": s.color,
                "is_won": s.is_won,
                "count": s.count,
            }
            for s in stages
        ]
        total_leads = sum(s["count"] for s in by_stage)
        won = sum(s["count"] for s in by_stage if s["is_won"])

        emails = EmailMessage.objects.filter(organization=org)
        mails_sent = emails.filter(status=EmailMessage.Status.SENT).count()
        mails_pending = emails.exclude(status=EmailMessage.Status.SENT).count()

        return Response(
            {
                "total_leads": total_leads,
                "won": won,
                "conversion": round(won / total_leads * 100) if total_leads else 0,
                "mails_sent": mails_sent,
                "mails_pending": mails_pending,
                "needs_followup": len(stale_leads(org)),
                "by_stage": by_stage,
            }
        )
