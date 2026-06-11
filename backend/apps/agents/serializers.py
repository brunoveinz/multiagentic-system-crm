from rest_framework import serializers

from apps.pipeline.models import Lead

from .models import ChatMessage, CoachingLog, KnowledgeDoc


class KnowledgeDocSerializer(serializers.ModelSerializer):
    class Meta:
        model = KnowledgeDoc
        fields = ("id", "title", "content", "doc_type", "is_indexed", "created_at")
        read_only_fields = ("id", "is_indexed", "created_at")


class CoachingLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = CoachingLog
        fields = ("id", "date", "question", "answer", "is_indexed")


class CoachAnswerSerializer(serializers.Serializer):
    answer = serializers.CharField()


class CoachChatSerializer(serializers.Serializer):
    message = serializers.CharField()


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ("id", "role", "content", "created_at")


class DraftRequestSerializer(serializers.Serializer):
    lead = serializers.PrimaryKeyRelatedField(queryset=Lead.objects.all())
    objetivo = serializers.CharField()
    tono = serializers.CharField(required=False, default="cercano y profesional")

    def validate_lead(self, lead: Lead) -> Lead:
        org = self.context["request"].user.organization
        if lead.organization_id != org.id:
            raise serializers.ValidationError("El lead no pertenece a tu empresa.")
        return lead
