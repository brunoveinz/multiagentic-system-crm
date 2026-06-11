import logging

from django.contrib.auth import get_user_model
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import HasOrganization
from apps.emails.models import EmailAccount
from apps.emails.serializers import EmailAccountSerializer
from apps.emails.services import smtp

from .serializers import MeUpdateSerializer, SignupSerializer, UserSerializer

User = get_user_model()
logger = logging.getLogger(__name__)


class SignupView(generics.CreateAPIView):
    """Registro abierto. Devuelve el usuario creado (sin token: el login es aparte)."""

    queryset = User.objects.all()
    serializer_class = SignupSerializer
    permission_classes = [AllowAny]


class MeView(generics.RetrieveUpdateAPIView):
    """Ver y editar la propia cuenta (email / contraseña)."""

    permission_classes = [IsAuthenticated]

    def get_object(self) -> User:
        return self.request.user

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return MeUpdateSerializer
        return UserSerializer


class EmailAccountView(APIView):
    """Configuración SMTP de envío de la empresa (una por organización)."""

    permission_classes = [IsAuthenticated, HasOrganization]

    def get(self, request: Request) -> Response:
        acc = EmailAccount.objects.filter(organization=request.user.organization).first()
        if not acc:
            return Response({"configured": False})
        return Response(
            {
                "configured": True,
                "host": acc.host,
                "port": acc.port,
                "username": acc.username,
                "from_email": acc.from_email,
                "from_name": acc.from_name,
                "use_tls": acc.use_tls,
            }
        )

    def put(self, request: Request) -> Response:
        org = request.user.organization
        acc = EmailAccount.objects.filter(organization=org).first()
        if acc is None and not request.data.get("password"):
            return Response(
                {"detail": "La contraseña SMTP es obligatoria."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = EmailAccountSerializer(
            instance=acc, data=request.data, partial=acc is not None
        )
        serializer.is_valid(raise_exception=True)
        acc = serializer.save(organization=org, configured_by=request.user)

        result = {"configured": True, "from_email": acc.from_email}
        try:
            smtp.test_connection(acc)
        except Exception as exc:
            logger.warning("SMTP test falló para org %s: %s", org.id, exc)
            result["warning"] = "Guardado, pero la conexión SMTP falló. Revisa host, puerto y contraseña."
        return Response(result)
