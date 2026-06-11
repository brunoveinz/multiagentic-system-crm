from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import HasOrganization
from apps.common.viewsets import OrgScopedModelViewSet
from apps.emails.serializers import EmailMessageSerializer

from .models import CoachingLog, KnowledgeDoc
from .serializers import (
    ChatMessageSerializer,
    CoachAnswerSerializer,
    CoachChatSerializer,
    CoachingLogSerializer,
    DraftRequestSerializer,
    KnowledgeDocSerializer,
)
from .services import coach, followups, vectorstore
from .services.redactor import draft_email
from .tasks import index_knowledge_doc


class KnowledgeDocViewSet(OrgScopedModelViewSet):
    """Base de conocimiento de la empresa. Al guardar, se (re)indexa en Qdrant."""

    queryset = KnowledgeDoc.objects.all()
    serializer_class = KnowledgeDocSerializer

    def perform_create(self, serializer) -> None:
        doc = serializer.save(organization=self.request.user.organization)
        index_knowledge_doc.delay(doc.id)

    def perform_update(self, serializer) -> None:
        doc = serializer.save()
        KnowledgeDoc.objects.filter(pk=doc.pk).update(is_indexed=False)
        index_knowledge_doc.delay(doc.id)

    def perform_destroy(self, instance: KnowledgeDoc) -> None:
        vectorstore.delete_document(instance.id)
        instance.delete()


class DraftView(APIView):
    """Pide al agente Redactor un borrador de mail para un lead (human-in-the-loop)."""

    permission_classes = [IsAuthenticated, HasOrganization]

    def post(self, request: Request) -> Response:
        serializer = DraftRequestSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        sender_name = request.user.get_full_name() or request.user.username
        email = draft_email(
            lead=serializer.validated_data["lead"],
            objetivo=serializer.validated_data["objetivo"],
            tono=serializer.validated_data["tono"],
            sender_name=sender_name,
        )
        return Response(
            EmailMessageSerializer(email).data, status=status.HTTP_201_CREATED
        )


class CoachTodayView(APIView):
    """Pregunta de coaching de hoy (la genera si no existe)."""

    permission_classes = [IsAuthenticated, HasOrganization]

    def get(self, request: Request) -> Response:
        log = coach.get_or_create_today(request.user)
        return Response(CoachingLogSerializer(log).data)


class CoachAnswerView(APIView):
    """Guarda tu respuesta del día y la embebe en Qdrant (memoria del coach)."""

    permission_classes = [IsAuthenticated, HasOrganization]

    def post(self, request: Request) -> Response:
        serializer = CoachAnswerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        log = coach.save_answer(request.user, serializer.validated_data["answer"])
        return Response(CoachingLogSerializer(log).data)


class CoachChatView(APIView):
    """Conversación libre con el coach. Persiste e indexa cada intercambio."""

    permission_classes = [IsAuthenticated, HasOrganization]

    def get(self, request: Request) -> Response:
        return Response(
            ChatMessageSerializer(coach.chat_history(request.user), many=True).data
        )

    def post(self, request: Request) -> Response:
        serializer = CoachChatSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reply = coach.chat(request.user, serializer.validated_data["message"])
        return Response({"reply": reply})


class CoachHistoryView(APIView):
    """Historial de coaching del vendedor."""

    permission_classes = [IsAuthenticated, HasOrganization]

    def get(self, request: Request) -> Response:
        logs = CoachingLog.objects.filter(user=request.user).order_by("-date")[:30]
        return Response(CoachingLogSerializer(logs, many=True).data)


class FollowupsView(APIView):
    """Leads que necesitan seguimiento (estancados)."""

    permission_classes = [IsAuthenticated, HasOrganization]

    def get(self, request: Request) -> Response:
        leads = followups.stale_leads(request.user.organization)
        data = [
            {
                "id": lead.id,
                "name": lead.name,
                "company": lead.company,
                "stage": lead.stage.name,
                "days": followups.days_since_activity(lead),
            }
            for lead in leads
        ]
        return Response(data)
