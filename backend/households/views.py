from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import viewsets

from common.permissions import StrictModelPermissions

from .models import Household, HouseholdMembership, HouseholdOccupancy, HousingUnit
from .serializers import (
    HouseholdMembershipSerializer,
    HouseholdOccupancySerializer,
    HouseholdSerializer,
    HousingUnitSerializer,
)


class RecordedByViewSet(viewsets.ModelViewSet):
    permission_classes = (StrictModelPermissions,)
    http_method_names = ("get", "post", "patch", "head", "options")

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class HouseholdViewSet(RecordedByViewSet):
    serializer_class = HouseholdSerializer
    filterset_fields = ("is_active",)
    search_fields = ("reference", "label", "address_text", "purok_sitio")
    ordering_fields = ("label", "created_at", "updated_at")
    ordering = ("label",)

    def get_queryset(self):
        today = timezone.localdate()
        currently_effective = Q(memberships__valid_from__lte=today) & (
            Q(memberships__valid_to__isnull=True) | Q(memberships__valid_to__gte=today)
        )
        return Household.objects.annotate(
            active_member_count=Count("memberships", filter=currently_effective, distinct=True)
        )


class HousingUnitViewSet(RecordedByViewSet):
    serializer_class = HousingUnitSerializer
    queryset = HousingUnit.objects.all()
    filterset_fields = ("is_active",)
    search_fields = ("reference", "label", "house_number", "address_text", "property_type")
    ordering_fields = ("label", "created_at", "updated_at")
    ordering = ("label",)


class HistoricalPeriodViewSet(RecordedByViewSet):
    """Serialize period edits so validation sees the latest committed end date."""

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action in ("update", "partial_update"):
            return queryset.select_for_update(of=("self",))
        return queryset


class HouseholdMembershipViewSet(HistoricalPeriodViewSet):
    serializer_class = HouseholdMembershipSerializer
    queryset = HouseholdMembership.objects.select_related("resident", "household")
    filterset_fields = ("resident", "household", "relationship", "is_head", "valid_to")
    ordering_fields = ("valid_from", "valid_to", "created_at")
    ordering = ("-valid_from",)


class HouseholdOccupancyViewSet(HistoricalPeriodViewSet):
    serializer_class = HouseholdOccupancySerializer
    queryset = HouseholdOccupancy.objects.select_related("household", "housing_unit")
    filterset_fields = ("household", "housing_unit", "valid_to")
    ordering_fields = ("valid_from", "valid_to", "created_at")
    ordering = ("-valid_from",)
