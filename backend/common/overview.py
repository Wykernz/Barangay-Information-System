"""Read-only, database-backed counts for the staff overview."""

from django.conf import settings
from django.db.models import Q
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from households.models import Household, HouseholdOccupancy, HousingUnit
from profiling.models import Resident


class OverviewSerializer(serializers.Serializer):
    as_of = serializers.DateField()
    registered_persons = serializers.IntegerField()
    verified_residents = serializers.IntegerField()
    active_households = serializers.IntegerField()
    housing_units = serializers.IntegerField()
    occupied_units = serializers.IntegerField()
    mapped_units = serializers.IntegerField(allow_null=True)
    age_groups = serializers.DictField(child=serializers.IntegerField())
    residency = serializers.DictField(child=serializers.IntegerField())
    sex = serializers.DictField(child=serializers.IntegerField())


@extend_schema(responses=OverviewSerializer)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def overview(request):
    required = (
        "profiling.view_resident",
        "households.view_household",
        "households.view_housingunit",
    )
    if not request.user.has_perms(required):
        raise PermissionDenied("Overview requires registry view permissions.")

    today = timezone.localdate()
    persons = Resident.objects.filter(is_archived=False)
    age_groups = {label: 0 for label in ("0-14", "15-24", "25-34", "35-44", "45-59", "60+")}
    age_groups["Not recorded"] = 0
    for birth_date in persons.values_list("birth_date", flat=True).iterator():
        if birth_date is None:
            age_groups["Not recorded"] += 1
            continue
        age = (
            today.year
            - birth_date.year
            - ((today.month, today.day) < (birth_date.month, birth_date.day))
        )
        label = next(
            (
                name
                for limit, name in (
                    (14, "0-14"),
                    (24, "15-24"),
                    (34, "25-34"),
                    (44, "35-44"),
                    (59, "45-59"),
                )
                if age <= limit
            ),
            "60+",
        )
        age_groups[label] += 1

    current_occupancies = HouseholdOccupancy.objects.filter(
        household__is_active=True, valid_from__lte=today
    ).filter(Q(valid_to__isnull=True) | Q(valid_to__gte=today))
    units = HousingUnit.objects.filter(is_active=True)
    mapped_units = None
    if settings.GIS_ENABLED and request.user.has_perm("gis.view_housinglocation"):
        from gis.models import HousingLocation

        mapped_units = (
            HousingLocation.objects.filter(housing_unit__in=units, superseded_by__isnull=True)
            .values("housing_unit_id")
            .distinct()
            .count()
        )

    return Response(
        {
            "as_of": today,
            "registered_persons": persons.count(),
            "verified_residents": persons.filter(
                residency_classification="RESIDENT",
                verification_status=Resident.VerificationStatus.VERIFIED,
            ).count(),
            "active_households": Household.objects.filter(is_active=True).count(),
            "housing_units": units.count(),
            "occupied_units": current_occupancies.filter(housing_unit__in=units)
            .values("housing_unit_id")
            .distinct()
            .count(),
            "mapped_units": mapped_units,
            "age_groups": age_groups,
            "residency": {
                "Resident": persons.filter(residency_classification="RESIDENT").count(),
                "Non-resident": persons.filter(residency_classification="NON_RESIDENT").count(),
                "Pending classification": persons.filter(
                    residency_classification__isnull=True
                ).count(),
            },
            "sex": {
                "Male": persons.filter(sex="Male").count(),
                "Female": persons.filter(sex="Female").count(),
                "Other or not recorded": persons.exclude(sex__in=("Male", "Female")).count(),
            },
        }
    )
