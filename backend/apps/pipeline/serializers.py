from rest_framework import serializers

from .models import Activity, Contact, Lead, Stage


class StageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Stage
        fields = ("id", "name", "order", "is_won", "color")


class ContactSerializer(serializers.ModelSerializer):
    """Lectura y creación inline (sin `lead`, que se asigna en contexto)."""

    class Meta:
        model = Contact
        fields = ("id", "name", "email", "role", "phone")


class ContactCreateSerializer(serializers.ModelSerializer):
    """Para crear un contacto suelto sobre un lead ya existente."""

    class Meta:
        model = Contact
        fields = ("id", "name", "email", "role", "phone", "lead")

    def validate_lead(self, lead: Lead) -> Lead:
        org = self.context["request"].user.organization
        if lead.organization_id != org.id:
            raise serializers.ValidationError("El lead no pertenece a tu empresa.")
        return lead


class ActivitySerializer(serializers.ModelSerializer):
    actor = serializers.SerializerMethodField()

    class Meta:
        model = Activity
        fields = ("id", "kind", "description", "actor", "created_at")

    def get_actor(self, obj: Activity) -> str | None:
        return obj.actor.username if obj.actor_id else None


class LeadCardSerializer(serializers.ModelSerializer):
    """Vista liviana para las tarjetas del Kanban."""

    class Meta:
        model = Lead
        fields = ("id", "name", "company", "context", "stage", "created_at")


class LeadDetailSerializer(serializers.ModelSerializer):
    contacts = ContactSerializer(many=True, read_only=True)
    activities = ActivitySerializer(many=True, read_only=True)
    owner = serializers.SerializerMethodField()

    class Meta:
        model = Lead
        fields = (
            "id", "name", "company", "context", "stage", "owner",
            "created_at", "contacts", "activities",
        )

    def get_owner(self, obj: Lead) -> str | None:
        return obj.owner.username if obj.owner_id else None


class LeadCreateSerializer(serializers.ModelSerializer):
    contacts = ContactSerializer(many=True, required=False)

    class Meta:
        model = Lead
        fields = ("id", "name", "company", "context", "stage", "contacts")

    def validate_stage(self, stage: Stage) -> Stage:
        org = self.context["request"].user.organization
        if stage.organization_id != org.id:
            raise serializers.ValidationError("La etapa no pertenece a tu empresa.")
        return stage

    def create(self, validated_data: dict) -> Lead:
        contacts_data = validated_data.pop("contacts", [])
        lead = Lead.objects.create(**validated_data)
        if contacts_data:
            Contact.objects.bulk_create(
                Contact(organization=lead.organization, lead=lead, **c)
                for c in contacts_data
            )
        Activity.objects.create(
            organization=lead.organization,
            lead=lead,
            kind=Activity.Kind.NOTE,
            description="Lead creado",
            actor=lead.owner,
        )
        return lead


class LeadUpdateSerializer(serializers.ModelSerializer):
    """Edición de campos de texto. El cambio de etapa va por la acción `move`."""

    class Meta:
        model = Lead
        fields = ("id", "name", "company", "context")


class BoardStageSerializer(serializers.ModelSerializer):
    """Una columna del tablero con sus leads anidados (board en una sola llamada)."""

    leads = LeadCardSerializer(many=True, read_only=True)

    class Meta:
        model = Stage
        fields = ("id", "name", "order", "is_won", "color", "leads")
