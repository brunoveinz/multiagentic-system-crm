from rest_framework import serializers

from .models import EmailAccount, EmailMessage


class EmailAccountSerializer(serializers.ModelSerializer):
    """Config SMTP. La contraseña es de solo escritura y se guarda cifrada."""

    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = EmailAccount
        fields = ("host", "port", "username", "from_email", "from_name", "use_tls", "password")

    def create(self, validated_data: dict) -> EmailAccount:
        password = validated_data.pop("password", "")
        account = EmailAccount(**validated_data)
        account.set_password(password)
        account.save()
        return account

    def update(self, instance: EmailAccount, validated_data: dict) -> EmailAccount:
        password = validated_data.pop("password", None)
        for key, value in validated_data.items():
            setattr(instance, key, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class EmailMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailMessage
        fields = (
            "id", "lead", "to_email", "subject", "body", "status",
            "generated_by", "rationale", "gmail_message_id", "sent_at", "created_at",
        )
        read_only_fields = fields


class EmailUpdateSerializer(serializers.ModelSerializer):
    """Edición del borrador antes de aprobar (asunto, cuerpo, destinatario)."""

    class Meta:
        model = EmailMessage
        fields = ("id", "to_email", "subject", "body")
