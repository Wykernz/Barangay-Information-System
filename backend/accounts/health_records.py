from django.db import transaction
from django.utils import timezone
from rest_framework import mixins, serializers, viewsets

from audit.services import record_event

from .access import HealthAccessPermission
from .models import HealthAssessment


class HealthAssessmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = HealthAssessment
        fields = ("id", "person", "assessment_date", "pregnancy_notes",
                  "family_planning_notes", "tb_screening_notes", "other_health_notes",
                  "created_at", "created_by")
        read_only_fields = ("id", "created_at", "created_by")

    def validate_assessment_date(self, value):
        if value > timezone.localdate():
            raise serializers.ValidationError("Assessment date cannot be in the future.")
        return value


class HealthAssessmentViewSet(mixins.CreateModelMixin, mixins.ListModelMixin,
                              mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    permission_classes = (HealthAccessPermission,)
    serializer_class = HealthAssessmentSerializer
    queryset = HealthAssessment.objects.all()
    filterset_fields = ("person", "assessment_date")
    http_method_names = ("get", "post", "head", "options")

    @transaction.atomic
    def perform_create(self, serializer):
        assessment = serializer.save(created_by=self.request.user)
        record_event(action="health.assessment.create", target=assessment,
                     actor=self.request.user)
