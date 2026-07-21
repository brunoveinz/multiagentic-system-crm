from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response

from apps.agents.services import prospector
from apps.common.viewsets import OrgScopedModelViewSet, OrgScopedReadOnlyViewSet

from .models import Activity, Contact, Lead, Stage
from .serializers import (
    ActivitySerializer,
    BoardStageSerializer,
    ContactCreateSerializer,
    LeadCardSerializer,
    LeadCreateSerializer,
    LeadDetailSerializer,
    LeadUpdateSerializer,
    ProspectImportSerializer,
    ProspectSearchSerializer,
    StageSerializer,
)
from .services import prospecting


class StageViewSet(OrgScopedReadOnlyViewSet):
    queryset = Stage.objects.all()
    serializer_class = StageSerializer


class ContactViewSet(OrgScopedModelViewSet):
    queryset = Contact.objects.all()
    serializer_class = ContactCreateSerializer


class LeadViewSet(OrgScopedModelViewSet):
    queryset = Lead.objects.select_related("stage", "owner")

    def get_serializer_class(self):
        return {
            "create": LeadCreateSerializer,
            "retrieve": LeadDetailSerializer,
            "update": LeadUpdateSerializer,
            "partial_update": LeadUpdateSerializer,
        }.get(self.action, LeadCardSerializer)

    def perform_create(self, serializer) -> None:
        # Asigna empresa y dueño (el vendedor que lo crea).
        serializer.save(
            organization=self.request.user.organization,
            owner=self.request.user,
        )

    @action(detail=False, methods=["get"])
    def board(self, request: Request) -> Response:
        """Devuelve todas las columnas con sus leads, para pintar el Kanban."""
        org = request.user.organization
        stages = (
            Stage.objects.filter(organization=org)
            .order_by("order", "id")
            .prefetch_related("leads")
        )
        return Response(BoardStageSerializer(stages, many=True).data)

    @action(detail=True, methods=["post"])
    def move(self, request: Request, pk: str | None = None) -> Response:
        """Mueve un lead a otra etapa y deja registro en el timeline."""
        lead = self.get_object()
        org = request.user.organization
        stage = get_object_or_404(Stage, pk=request.data.get("stage"), organization=org)
        if lead.stage_id != stage.id:
            old = lead.stage.name
            lead.stage = stage
            lead.save(update_fields=["stage", "updated_at"])
            Activity.objects.create(
                organization=org,
                lead=lead,
                kind=Activity.Kind.STAGE_CHANGE,
                description=f"{old} → {stage.name}",
                actor=request.user,
            )
        return Response(LeadCardSerializer(lead).data)

    @action(detail=False, methods=["post"])
    def prospect(self, request: Request) -> Response:
        """
        Prospección en el mapa: texto libre -> el agente lo estructura -> se
        busca en OpenStreetMap. Devuelve candidatos (aún NO son leads).
        """
        serializer = ProspectSearchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        query = prospector.interpret(serializer.validated_data["query"])
        filters = [f.model_dump() for f in query.filters]
        result = prospecting.search(query.location, filters)

        # Nombres ya usados por leads de esta org: marcamos los candidatos que ya
        # están en el pipeline para no duplicar a ojo desde el mapa.
        existing = set(
            Lead.objects.filter(organization=request.user.organization)
            .values_list("name", flat=True)
        )
        candidates = []
        for c in result.candidates:
            item = c.to_dict()
            item["already_lead"] = c.name in existing
            candidates.append(item)

        return Response(
            {
                "label": query.label,
                "location": query.location,
                "center": result.center,
                "bbox": result.bbox,
                "candidates": candidates,
            }
        )

    @action(detail=False, methods=["post"])
    def import_prospect(self, request: Request) -> Response:
        """Convierte un candidato del mapa en un Lead del pipeline."""
        serializer = ProspectImportSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        lead = serializer.save()
        return Response(
            LeadCardSerializer(lead).data, status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=["post"])
    def note(self, request: Request, pk: str | None = None) -> Response:
        """Agrega una nota al timeline del lead."""
        lead = self.get_object()
        description = (request.data.get("description") or "").strip()
        if not description:
            return Response(
                {"detail": "La nota no puede estar vacía."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        activity = Activity.objects.create(
            organization=request.user.organization,
            lead=lead,
            kind=Activity.Kind.NOTE,
            description=description,
            actor=request.user,
        )
        return Response(
            ActivitySerializer(activity).data, status=status.HTTP_201_CREATED
        )
