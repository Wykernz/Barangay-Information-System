import django_filters
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets

from common.permissions import StrictModelPermissions

from .models import AuditEvent
from .serializers import AuditEventSerializer


class AuditEventFilter(django_filters.FilterSet):
    date_from = django_filters.DateFilter(field_name="occurred_at", lookup_expr="date__gte")
    date_to = django_filters.DateFilter(field_name="occurred_at", lookup_expr="date__lte")
    staff = django_filters.CharFilter(field_name="actor__username", lookup_expr="icontains")

    class Meta:
        model = AuditEvent
        fields = ("action", "actor", "date_from", "date_to", "staff")


class AuditEventViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only audit projection; metadata is intentionally not serialized."""

    queryset = AuditEvent.objects.select_related("actor").all()
    serializer_class = AuditEventSerializer
    permission_classes = (StrictModelPermissions,)
    filter_backends = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)
    filterset_class = AuditEventFilter
    search_fields = ("action", "target_type", "target_id")
    ordering_fields = ("occurred_at", "action")
    ordering = ("-occurred_at", "-id")
