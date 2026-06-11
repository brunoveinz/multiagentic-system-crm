from rest_framework import serializers

from .models import NorthMetric, Organization


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = (
            "id", "name", "slug", "objective",
            "default_north_metric", "coach_instructions",
        )
        read_only_fields = ("id", "slug")


class OnboardingSerializer(serializers.Serializer):
    """Datos que el usuario completa al crear su empresa."""

    name = serializers.CharField(max_length=200)
    objective = serializers.CharField(required=False, allow_blank=True, default="")
    default_north_metric = serializers.ChoiceField(
        choices=NorthMetric.choices,
        default=NorthMetric.MAILS,
    )
