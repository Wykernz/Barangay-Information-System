from decimal import Decimal
from uuid import UUID

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import APIException, ValidationError

from accounts.models import User
from households.models import Household, HouseholdOccupancy, HousingUnit

from .models import HousingLocation


@transaction.atomic
def record_housing_location(*, housing_unit, created_by=None, **attributes) -> HousingLocation:
    """Append a corrected location and supersede only the previous current revision."""
    # Lock the parent even for the very first revision, when there is no point to lock.
    HousingUnit.objects.select_for_update().get(pk=housing_unit.pk)
    current = (
        HousingLocation.objects.select_for_update()
        .filter(housing_unit=housing_unit, superseded_by__isnull=True)
        .first()
    )
    revision = HousingLocation.objects.create(
        housing_unit=housing_unit, created_by=created_by, **attributes
    )
    if current is not None:
        current.superseded_by = revision
        current.save(update_fields=("superseded_by", "updated_at"))
    return revision


class LocationConflict(APIException):
    status_code = 409
    default_detail = "The location or occupancy changed. Reload before saving."


@transaction.atomic
def locate_household(
    *,
    household: Household,
    actor: User,
    longitude: float,
    latitude: float,
    expected_location: UUID | None,
    expected_housing_unit: UUID,
    source: str,
    accuracy_m: Decimal | None = None,
) -> HousingLocation:
    from django.contrib.gis.geos import Point

    household = Household.objects.select_for_update().get(pk=household.pk)
    if not household.is_active:
        raise ValidationError("Inactive households cannot receive a new location.")
    today = timezone.localdate()
    occupancies = list(
        HouseholdOccupancy.objects.select_for_update()
        .filter(household=household, valid_from__lte=today)
        .filter(Q(valid_to__isnull=True) | Q(valid_to__gte=today))[:2]
    )
    if len(occupancies) != 1:
        raise ValidationError(
            "Assign exactly one current housing unit before mapping this household."
        )
    if occupancies[0].housing_unit_id != expected_housing_unit:
        raise LocationConflict()
    unit = HousingUnit.objects.select_for_update().get(pk=occupancies[0].housing_unit_id)
    if not unit.is_active:
        raise ValidationError("Inactive housing units cannot receive a new location.")
    current = HousingLocation.objects.filter(housing_unit=unit, superseded_by__isnull=True).first()
    if (current.pk if current else None) != expected_location:
        raise LocationConflict()
    return record_housing_location(
        housing_unit=unit,
        created_by=actor,
        point=Point(longitude, latitude, srid=4326),
        source=source,
        collection_method="Staff map selection",
        source_crs="EPSG:4326",
        accuracy_m=accuracy_m,
    )
