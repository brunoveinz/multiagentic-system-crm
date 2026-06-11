from rest_framework.permissions import BasePermission


class HasOrganization(BasePermission):
    """Exige que el usuario ya haya creado su empresa (pasó el onboarding)."""

    message = "Primero necesitas crear tu empresa."

    def has_permission(self, request, view) -> bool:
        user = request.user
        return bool(user and user.is_authenticated and user.organization_id)
