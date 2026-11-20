"""Canonical household/map bridge; preview identifiers never enter the database."""

import math
import os
import re
from pathlib import Path

from django.conf import settings
from django.db.models import Q
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .map_config import map_config
from .models import Household, HouseholdOccupancy


class MapLocationInput(serializers.Serializer):
    longitude = serializers.FloatField(min_value=-180, max_value=180)
    latitude = serializers.FloatField(min_value=-90, max_value=90)
    expected_location = serializers.UUIDField(allow_null=True)
    expected_housing_unit = serializers.UUIDField()
    source = serializers.CharField(max_length=200)
    accuracy_m = serializers.DecimalField(
        max_digits=8, decimal_places=2, min_value=0, allow_null=True, required=False
    )

    def validate(self, attrs):
        if not all(math.isfinite(attrs[key]) for key in ("latitude", "longitude")):
            raise serializers.ValidationError("Coordinates must be finite numbers.")
        return attrs


class MapPointOutput(serializers.Serializer):
    id = serializers.UUIDField()
    latitude = serializers.FloatField()
    longitude = serializers.FloatField()
    source = serializers.CharField()
    accuracy_m = serializers.DecimalField(max_digits=8, decimal_places=2, allow_null=True)
    verification_status = serializers.CharField()


class MapHouseholdOutput(serializers.Serializer):
    id = serializers.UUIDField()
    reference = serializers.CharField()
    label = serializers.CharField()
    is_active = serializers.BooleanField()
    housing_unit = serializers.UUIDField(allow_null=True)
    housing_label = serializers.CharField(allow_null=True)
    occupancy_conflict = serializers.BooleanField()
    location = MapPointOutput(allow_null=True)


class MapHouseholdPage(serializers.Serializer):
    count = serializers.IntegerField()
    next = serializers.URLField(allow_null=True)
    previous = serializers.URLField(allow_null=True)
    results = MapHouseholdOutput(many=True)


def require_map_access(user) -> None:
    permissions = [
        "households.view_household",
        "households.view_housingunit",
        "households.view_householdoccupancy",
    ]
    if settings.GIS_ENABLED:
        permissions.append("gis.view_housinglocation")
    if not user.has_perms(permissions):
        raise PermissionDenied(
            "Household, occupancy, housing and location read permissions required."
        )


def household_map_row(household: Household) -> dict:
    today = timezone.localdate()
    occupancies = list(
        HouseholdOccupancy.objects.select_related("housing_unit")
        .filter(household=household, valid_from__lte=today)
        .filter(Q(valid_to__isnull=True) | Q(valid_to__gte=today))[:2]
    )
    # Ambiguous existing occupancy is surfaced, never resolved by choosing an arbitrary house.
    occupancy = occupancies[0] if len(occupancies) == 1 else None
    location = None
    if occupancy and settings.GIS_ENABLED:
        from gis.models import HousingLocation

        revision = HousingLocation.objects.filter(
            housing_unit=occupancy.housing_unit, superseded_by__isnull=True
        ).first()
        if revision:
            location = {
                "id": str(revision.id),
                "latitude": revision.point.y,
                "longitude": revision.point.x,
                "source": revision.source,
                "accuracy_m": str(revision.accuracy_m) if revision.accuracy_m is not None else None,
                "verification_status": revision.verification_status,
            }
    return {
        "id": str(household.id),
        "reference": household.reference,
        "label": household.label,
        "is_active": household.is_active,
        "housing_unit": str(occupancy.housing_unit_id) if occupancy else None,
        "housing_label": occupancy.housing_unit.label if occupancy else None,
        "occupancy_conflict": len(occupancies) > 1,
        "location": location,
    }


@extend_schema(
    responses=inline_serializer(
        "MapConfiguration",
        fields={
            "gis_enabled": serializers.BooleanField(),
            "can_edit": serializers.BooleanField(),
            "center": serializers.ListField(child=serializers.FloatField()),
            "zoom": serializers.IntegerField(),
            "providers": serializers.ListField(),
            "boundary_url": serializers.CharField(),
        },
    )
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def configuration(request):
    return Response(
        {
            **map_config(),
            "gis_enabled": settings.GIS_ENABLED,
            "can_edit": settings.GIS_ENABLED
            and request.user.has_perms(
                [
                    "gis.add_housinglocation",
                    "gis.change_housinglocation",
                    "gis.view_housinglocation",
                    "households.view_household",
                    "households.view_householdoccupancy",
                    "households.view_housingunit",
                ]
            ),
        }
    )


@extend_schema(operation_id="gis_households_list", responses=MapHouseholdPage)
@api_view(["GET"])
def household_directory(request):
    require_map_access(request.user)
    paginator = PageNumberPagination()
    rows = paginator.paginate_queryset(Household.objects.all(), request)
    return paginator.get_paginated_response([household_map_row(row) for row in rows])


@extend_schema(operation_id="gis_household_detail", responses=MapHouseholdOutput)
@api_view(["GET"])
def household_detail(request, pk):
    require_map_access(request.user)
    return Response(household_map_row(get_object_or_404(Household, pk=pk)))


@extend_schema(request=MapLocationInput, responses={201: MapHouseholdOutput})
@api_view(["POST"])
def household_location(request, pk):
    require_map_access(request.user)
    if not settings.GIS_ENABLED:
        return Response(
            {"detail": "PostGIS/GDAL/GEOS must be enabled before saving locations."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    if not request.user.has_perms(["gis.add_housinglocation", "gis.change_housinglocation"]):
        raise PermissionDenied("Location capture and correction permissions are required.")
    serializer = MapLocationInput(data=request.data)
    serializer.is_valid(raise_exception=True)
    from gis.services import locate_household

    household = get_object_or_404(Household, pk=pk)
    locate_household(household=household, actor=request.user, **serializer.validated_data)
    return Response(household_map_row(household), status=status.HTTP_201_CREATED)


@extend_schema(exclude=True)
@api_view(["GET"])
def local_tile(request, style, z, x, filename):
    """Serve only operator-provisioned XYZ imagery; never proxy/download public tiles."""
    match = re.fullmatch(r"(\d+)\.(png|jpg|jpeg)", filename)
    if style not in ("street", "satellite") or not match or not 0 <= z <= 20:
        raise Http404
    y = int(match[1])
    if not (0 <= x < 2**z and 0 <= y < 2**z):
        raise Http404
    root = Path(
        os.environ.get("GIS_LOCAL_TILE_ROOT", settings.BASE_DIR.parent / ".local/map-tiles")
    )
    tile = (root / style / str(z) / str(x) / filename).resolve()
    if not tile.is_relative_to(root.resolve()) or not tile.is_file():
        raise Http404
    response = FileResponse(
        tile.open("rb"), content_type=("image/png" if match[2] == "png" else "image/jpeg")
    )
    response["Cache-Control"] = "private, max-age=86400"
    return response
