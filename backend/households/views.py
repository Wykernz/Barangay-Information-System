from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from common.permissions import StrictModelPermissions

from .models import Household, HouseholdMembership, HouseholdOccupancy, HousingUnit
from .serializers import (
    EffectiveDateSerializer,
    HouseholdMembershipSerializer,
    HouseholdMoveResultSerializer,
    HouseholdMoveSerializer,
    HouseholdOccupancySerializer,
    HouseholdSerializer,
    HousingUnitSerializer,
    MembershipAssignmentSerializer,
    MembershipTransferResultSerializer,
    MembershipTransferSerializer,
)
from .services import (
    HouseholdWorkflowError,
    assign_resident,
    end_membership,
    move_household,
    transfer_resident,
)


def require_permissions(user, *permissions):
    if not user.has_perms(permissions):
        raise PermissionDenied("This household workflow is not permitted for this account.")


def workflow_error(error):
    return Response({"detail": str(error)}, status=status.HTTP_409_CONFLICT)


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

    @extend_schema(
        request=MembershipAssignmentSerializer,
        responses={201: HouseholdMembershipSerializer},
    )
    @action(
        detail=True,
        methods=("post",),
        url_path="members",
        permission_classes=(IsAuthenticated,),
    )
    def add_member(self, request, pk=None):
        require_permissions(
            request.user,
            "households.add_householdmembership",
            "households.view_household",
            "profiling.view_resident",
        )
        household = self.get_object()
        serializer = MembershipAssignmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            membership = assign_resident(
                actor=request.user, household=household, **serializer.validated_data
            )
        except HouseholdWorkflowError as error:
            return workflow_error(error)
        return Response(
            HouseholdMembershipSerializer(membership).data,
            status=status.HTTP_201_CREATED,
        )

    @extend_schema(request=HouseholdMoveSerializer, responses=HouseholdMoveResultSerializer)
    @action(
        detail=True,
        methods=("post",),
        url_path="move",
        permission_classes=(IsAuthenticated,),
    )
    def move(self, request, pk=None):
        require_permissions(
            request.user,
            "households.add_householdoccupancy",
            "households.change_householdoccupancy",
            "households.view_household",
        )
        household = self.get_object()
        serializer = HouseholdMoveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            ended, created = move_household(
                actor=request.user, household=household, **serializer.validated_data
            )
        except HouseholdWorkflowError as error:
            return workflow_error(error)
        return Response(
            {
                "ended_occupancy": (
                    HouseholdOccupancySerializer(ended).data if ended else None
                ),
                "created_occupancy": HouseholdOccupancySerializer(created).data,
            }
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

    def create(self, request, *args, **kwargs):
        return Response(
            {"detail": "Assign residents through a household's members action."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    @extend_schema(request=EffectiveDateSerializer, responses=HouseholdMembershipSerializer)
    @action(
        detail=True,
        methods=("post",),
        url_path="end",
        permission_classes=(IsAuthenticated,),
    )
    def end(self, request, pk=None):
        require_permissions(request.user, "households.change_householdmembership")
        serializer = EffectiveDateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            membership = end_membership(
                actor=request.user,
                membership=self.get_object(),
                **serializer.validated_data,
            )
        except HouseholdWorkflowError as error:
            return workflow_error(error)
        return Response(self.get_serializer(membership).data)

    @extend_schema(
        request=MembershipTransferSerializer,
        responses={200: MembershipTransferResultSerializer},
    )
    @action(
        detail=True,
        methods=("post",),
        url_path="transfer",
        permission_classes=(IsAuthenticated,),
    )
    def transfer(self, request, pk=None):
        require_permissions(
            request.user,
            "households.add_householdmembership",
            "households.change_householdmembership",
            "households.view_household",
        )
        serializer = MembershipTransferSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            ended, created = transfer_resident(
                actor=request.user,
                membership=self.get_object(),
                **serializer.validated_data,
            )
        except HouseholdWorkflowError as error:
            return workflow_error(error)
        return Response(
            {
                "ended_membership": self.get_serializer(ended).data,
                "created_membership": self.get_serializer(created).data,
            }
        )


class HouseholdOccupancyViewSet(HistoricalPeriodViewSet):
    serializer_class = HouseholdOccupancySerializer
    queryset = HouseholdOccupancy.objects.select_related("household", "housing_unit")
    filterset_fields = ("household", "housing_unit", "valid_to")
    ordering_fields = ("valid_from", "valid_to", "created_at")
    ordering = ("-valid_from",)

    def create(self, request, *args, **kwargs):
        return Response(
            {"detail": "Move a household through its move action."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )
