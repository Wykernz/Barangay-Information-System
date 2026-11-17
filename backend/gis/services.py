from django.db import transaction

from .models import HousingLocation


@transaction.atomic
def record_housing_location(*, housing_unit, created_by=None, **attributes) -> HousingLocation:
    """Append a corrected location and supersede only the previous current revision."""
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
