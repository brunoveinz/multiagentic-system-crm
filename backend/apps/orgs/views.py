from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import HasOrganization

from .models import Organization
from .serializers import OnboardingSerializer, OrganizationSerializer
from .services import create_organization_for_user


class OrgMeView(generics.RetrieveUpdateAPIView):
    """Ver y editar la empresa del usuario (nombre, objetivo, métrica, coach)."""

    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticated, HasOrganization]

    def get_object(self) -> Organization:
        return self.request.user.organization


class OnboardingView(APIView):
    """Crea la empresa del usuario. Un usuario solo puede tener una."""

    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        if request.user.organization_id is not None:
            return Response(
                {"detail": "El usuario ya tiene una empresa asignada."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = OnboardingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        org = create_organization_for_user(
            request.user,
            name=serializer.validated_data["name"],
            objective=serializer.validated_data["objective"],
            north_metric=serializer.validated_data["default_north_metric"],
        )
        return Response(OrganizationSerializer(org).data, status=status.HTTP_201_CREATED)
