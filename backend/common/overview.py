"""Read-only, database-backed counts for the staff overview."""

from django.conf import settings
from django.db.models import Count, Q
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
    household_sizes = serializers.DictField(child=serializers.IntegerField())
    water_sources = serializers.DictField(child=serializers.IntegerField())
    sanitation = serializers.DictField(child=serializers.IntegerField())
    data_quality = serializers.DictField(child=serializers.IntegerField())
    residency = serializers.DictField(child=serializers.IntegerField())
    sex = serializers.DictField(child=serializers.IntegerField())


AGE_GROUPS = (
    (5, "Early Childhood (0-5)"),
    (12, "Children (6-12)"),
    (17, "Teenagers / Adolescents (13-17)"),
    (24, "Young Adults (18-24)"),
    (34, "Adults (25-34)"),
    (44, "Middle Adults (35-44)"),
    (59, "Older Adults (45-59)"),
    (74, "Senior Citizens (60-74)"),
)


def choice_distribution(queryset, field_name, choices):
    """Return stable display labels, including unknown values as not recorded."""
    labels = {value: label for value, label in choices}
    result = {label: 0 for label in labels.values()}
    result["Not recorded"] = 0
    for value, count in queryset.values_list(field_name).annotate(count=Count("id")):
        result[labels.get(value, "Not recorded")] += count
    return result


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
    age_groups = {label: 0 for _, label in AGE_GROUPS}
    age_groups["75+ (classification pending)"] = 0
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
            (name for limit, name in AGE_GROUPS if age <= limit),
            "75+ (classification pending)",
        )
        age_groups[label] += 1

    active_households = Household.objects.filter(is_active=True)
    current_members = Q(memberships__valid_from__lte=today) & (
        Q(memberships__valid_to__isnull=True) | Q(memberships__valid_to__gte=today)
    )
    household_sizes = {label: 0 for label in ("0", "1", "2-3", "4-5", "6+")}
    for member_count in active_households.annotate(
        current_member_count=Count("memberships", filter=current_members, distinct=True)
    ).values_list("current_member_count", flat=True):
        label = (
            "0"
            if member_count == 0
            else "1"
            if member_count == 1
            else "2-3"
            if member_count <= 3
            else "4-5"
            if member_count <= 5
            else "6+"
        )
        household_sizes[label] += 1

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
            "active_households": active_households.count(),
            "housing_units": units.count(),
            "occupied_units": current_occupancies.filter(housing_unit__in=units)
            .values("housing_unit_id")
            .distinct()
            .count(),
            "mapped_units": mapped_units,
            "age_groups": age_groups,
            "household_sizes": household_sizes,
            "water_sources": choice_distribution(
                active_households, "water_source", Household._meta.get_field("water_source").choices
            ),
            "sanitation": choice_distribution(
                active_households,
                "sanitation_type",
                Household._meta.get_field("sanitation_type").choices,
            ),
            "data_quality": {
                "Residents missing birthdate": persons.filter(birth_date__isnull=True).count(),
                "Residents awaiting verification": persons.exclude(
                    verification_status=Resident.VerificationStatus.VERIFIED
                ).count(),
                "Residents missing residency classification": persons.filter(
                    residency_classification__isnull=True
                ).count(),
                "Households missing water source": active_households.filter(
                    water_source__isnull=True
                ).count(),
                "Households missing sanitation": active_households.filter(
                    sanitation_type__isnull=True
                ).count(),
                "Housing units without current occupancy": units.exclude(
                    id__in=current_occupancies.values("housing_unit_id")
                ).count(),
            },
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
