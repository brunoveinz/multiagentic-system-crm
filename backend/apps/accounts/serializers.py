from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from apps.orgs.serializers import OrganizationSerializer

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Usuario actual + su empresa (para el frontend)."""

    organization = OrganizationSerializer(read_only=True)

    class Meta:
        model = User
        fields = ("id", "username", "email", "organization")


class MeUpdateSerializer(serializers.ModelSerializer):
    """Edición de la propia cuenta: email y, opcionalmente, contraseña."""

    password = serializers.CharField(
        write_only=True, required=False, validators=[validate_password]
    )

    class Meta:
        model = User
        fields = ("email", "password")

    def update(self, instance: "User", validated_data: dict) -> "User":
        password = validated_data.pop("password", None)
        instance.email = validated_data.get("email", instance.email)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class SignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = User
        fields = ("username", "email", "password")

    def create(self, validated_data: dict) -> "User":
        user = User(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
        )
        user.set_password(validated_data["password"])
        user.save()
        return user
