import datetime
from datetime import date
from decimal import Decimal, InvalidOperation
from typing import Iterable

from django.db.models import Case, IntegerField, Q, Value, When

from .models import FormField, Resident


class ProfileValidationError(ValueError):
    def __init__(self, errors: dict[str, str]):
        super().__init__("Profile values do not match the selected form definition.")
        self.errors = errors


def validate_profile_values(fields: Iterable[FormField], values: object) -> dict:
    """Validate extension values against a versioned, explicit field definition."""
    errors: dict[str, str] = {}
    if not isinstance(values, dict):
        raise ProfileValidationError({"values": "Expected an object of field values."})

    definitions = list(fields)
    known_keys = {field.key for field in definitions}
    for key in values.keys() - known_keys:
        errors[key] = "This key is not present in the selected form definition."

    for field in definitions:
        value = values.get(field.key)
        missing = value is None or (isinstance(value, str) and not value.strip()) or value == []
        if field.required and missing:
            errors[field.key] = "This field is required."
            continue
        if missing:
            continue

        valid = True
        match field.data_type:
            case FormField.DataType.TEXT:
                valid = isinstance(value, str) and len(value) <= 500
            case FormField.DataType.LONG_TEXT:
                valid = isinstance(value, str) and len(value) <= 20_000
            case FormField.DataType.INTEGER:
                valid = isinstance(value, int) and not isinstance(value, bool)
            case FormField.DataType.DECIMAL:
                try:
                    number = Decimal(str(value))
                    valid = not isinstance(value, bool) and number.is_finite()
                except (InvalidOperation, ValueError):
                    valid = False
            case FormField.DataType.BOOLEAN:
                valid = isinstance(value, bool)
            case FormField.DataType.DATE:
                try:
                    datetime.date.fromisoformat(value) if isinstance(value, str) else None
                    valid = isinstance(value, str)
                except ValueError:
                    valid = False
            case FormField.DataType.CHOICE:
                valid = isinstance(value, str) and value in field.options
            case FormField.DataType.MULTI_CHOICE:
                valid = (
                    isinstance(value, list)
                    and all(isinstance(item, str) and item in field.options for item in value)
                    and len(value) == len(set(value))
                )
        if not valid:
            errors[field.key] = f"Expected a valid {field.get_data_type_display().lower()} value."

    if errors:
        raise ProfileValidationError(errors)
    return values


def find_resident_duplicate_candidates(
    *, given_name: str, family_name: str, birth_date: date | None = None, limit: int = 20
) -> tuple[list[Resident], bool]:
    """Return exact-name candidates for staff review; never change canonical records."""
    candidates = Resident.objects.filter(
        given_name__iexact=given_name.strip(),
        family_name__iexact=family_name.strip(),
    )
    if birth_date is not None:
        candidates = candidates.filter(Q(birth_date=birth_date) | Q(birth_date__isnull=True))
        candidates = candidates.annotate(
            duplicate_rank=Case(
                When(birth_date=birth_date, then=Value(0)),
                default=Value(1),
                output_field=IntegerField(),
            )
        ).order_by("duplicate_rank", "id")
    else:
        candidates = candidates.order_by("id")
    page = list(candidates[: limit + 1])
    return page[:limit], len(page) > limit
