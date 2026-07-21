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


class ProspectSearchSerializer(serializers.Serializer):
    """Entrada de la prospección: lo que el vendedor busca, en lenguaje natural."""

    query = serializers.CharField(max_length=500)


class ProspectImportSerializer(serializers.Serializer):
    """
    Convierte un candidato del mapa en un Lead real (source=maps).
    Se le asigna la primera etapa del pipeline; el teléfono/web van al contacto.
    """

    name = serializers.CharField(max_length=200)
    company = serializers.CharField(max_length=200, required=False, allow_blank=True)
    address = serializers.CharField(max_length=300, required=False, allow_blank=True)
    latitude = serializers.FloatField(required=False, allow_null=True)
    longitude = serializers.FloatField(required=False, allow_null=True)
    phone = serializers.CharField(max_length=40, required=False, allow_blank=True)
    website = serializers.CharField(max_length=300, required=False, allow_blank=True)
    category = serializers.CharField(max_length=80, required=False, allow_blank=True)

    def create(self, validated_data: dict) -> Lead:
        from apps.agents.services import prospector

        from .services import enrichment

        request = self.context["request"]
        org = request.user.organization

        first_stage = Stage.objects.filter(organization=org).order_by("order", "id").first()
        if first_stage is None:
            raise serializers.ValidationError(
                "Tu pipeline no tiene etapas todavía; crea una antes de prospectar."
            )

        name = validated_data["name"]
        phone = validated_data.get("phone", "")
        website = validated_data.get("website", "")
        address = validated_data.get("address", "")
        category = validated_data.get("category", "")

        # Enriquecimiento sin APIs de pago: si hay web, la visitamos para sacar
        # email/teléfono/redes reales (OSM rara vez trae un contacto).
        found_email = ""
        socials: list[str] = []
        try:
            data = enrichment.enrich_from_website(website)
            found_email = data.email
            phone = phone or data.phone  # el teléfono de OSM manda si ya existe
            socials = data.socials
        except Exception:  # noqa: BLE001 - el enriquecimiento es best-effort
            pass

        # Datos duros que sí trajimos del mapa + web (para que el contexto no quede vacío).
        facts = " · ".join(b for b in (category, address, website, *socials) if b)

        # La IA redacta el ángulo de venta; si falla, caemos a los datos duros para
        # que el lead NUNCA llegue sin contexto.
        try:
            angle = prospector.suggest_angle(
                name=name,
                category=category,
                address=address,
                org_name=org.name,
                org_objetivo=org.objective or "",
            )
        except Exception:  # noqa: BLE001 - el enriquecimiento es best-effort
            angle = ""

        context = "\n\n".join(part for part in (angle, f"📍 {facts}" if facts else "") if part)

        lead = Lead.objects.create(
            organization=org,
            owner=request.user,
            stage=first_stage,
            source=Lead.SOURCE_MAPS,
            name=name,
            company=validated_data.get("company", "") or name,
            address=address,
            latitude=validated_data.get("latitude"),
            longitude=validated_data.get("longitude"),
            context=context,
        )

        # Contacto: reunimos lo mejor de OSM + enriquecimiento web. Solo lo
        # creamos si hay algo accionable (email o teléfono).
        if found_email or phone:
            Contact.objects.create(
                organization=org,
                lead=lead,
                name=name,
                role="Contacto del local",
                email=found_email,
                phone=phone,
            )

        Activity.objects.create(
            organization=org,
            lead=lead,
            kind=Activity.Kind.NOTE,
            description="Lead creado desde prospección en mapa",
            actor=request.user,
        )
        return lead


class BoardStageSerializer(serializers.ModelSerializer):
    """Una columna del tablero con sus leads anidados (board en una sola llamada)."""

    leads = LeadCardSerializer(many=True, read_only=True)

    class Meta:
        model = Stage
        fields = ("id", "name", "order", "is_won", "color", "leads")
