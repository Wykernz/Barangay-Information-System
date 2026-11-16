from datetime import date

import pytest

from .models import FormField, Resident
from .serializers import FormFieldSerializer
from .services import ProfileValidationError, validate_profile_values


def test_required_choice_accepts_only_defined_options():
    field = FormField(key="purok", data_type="choice", required=True, options=["Demo North"])
    assert validate_profile_values([field], {"purok": "Demo North"}) == {"purok": "Demo North"}
    with pytest.raises(ProfileValidationError) as error:
        validate_profile_values([field], {"purok": "Invented North"})
    assert "purok" in error.value.errors


def test_unknown_extension_key_is_rejected():
    with pytest.raises(ProfileValidationError) as error:
        validate_profile_values([], {"unapproved_field": "value"})
    assert "unapproved_field" in error.value.errors


@pytest.mark.parametrize(
    ("data_type", "value"),
    [("integer", True), ("date", "2026-02-30"), ("multi_choice", ["A", "A"])],
)
def test_invalid_typed_values_are_rejected(data_type, value):
    field = FormField(key="sample", data_type=data_type, options=["A"])
    with pytest.raises(ProfileValidationError):
        validate_profile_values([field], {"sample": value})


def test_choice_field_requires_options():
    serializer = FormFieldSerializer(
        data={"key": "sex", "label": "Sex", "data_type": "choice", "position": 1, "options": []}
    )
    assert not serializer.is_valid()
    assert "options" in serializer.errors


def test_age_is_derived_for_an_explicit_effective_date():
    resident = Resident(birth_date=date(2000, 11, 20))
    assert resident.age_at(date(2026, 11, 19)) == 25
    assert resident.age_at(date(2026, 11, 20)) == 26
