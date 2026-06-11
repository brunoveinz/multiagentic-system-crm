"""
ViewSets base que aplican el aislamiento multi-tenant: cada usuario solo ve y
crea objetos de SU empresa. Reutilizable por todas las apps con datos scopeados.
"""
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .permissions import HasOrganization


class OrgScopedModelViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, HasOrganization]

    def get_queryset(self):
        return super().get_queryset().filter(
            organization=self.request.user.organization
        )

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization)


class OrgScopedReadOnlyViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated, HasOrganization]

    def get_queryset(self):
        return super().get_queryset().filter(
            organization=self.request.user.organization
        )
