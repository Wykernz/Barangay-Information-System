from rest_framework import serializers

from .models import AuditEvent


class AuditEventSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source="actor.username", read_only=True, allow_null=True)

    class Meta:
        model = AuditEvent
        fields = (
            "id",
            "occurred_at",
            "actor",
            "actor_username",
            "action",
            "target_type",
            "target_id",
        )
        read_only_fields = fields
