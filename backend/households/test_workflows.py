from datetime import date

import pytest

from households.models import Household, HousingUnit
from households.services import (
    HouseholdWorkflowError,
    assign_resident,
    move_household,
    transfer_resident,
)
from profiling.models import FormDefinition, Resident


@pytest.mark.django_db
def test_transfer_and_move_preserve_non_overlapping_history(django_user_model):
    actor = django_user_model.objects.create_user(username="synthetic-workflow")
    definition = FormDefinition.objects.create(
        module="residents", name="Synthetic workflow", created_by=actor
    )
    resident = Resident.objects.create(
        form_definition=definition,
        given_name="Synthetic",
        family_name="Member",
        created_by=actor,
    )
    first = Household.objects.create(label="First", created_by=actor)
    second = Household.objects.create(label="Second", created_by=actor)
    membership = assign_resident(
        actor=actor,
        resident=resident,
        household=first,
        relationship="Member",
        occupancy_type="FAMILY_MEMBER",
        effective_date=date(2026, 1, 1),
    )
    ended, created = transfer_resident(
        actor=actor,
        membership=membership,
        destination=second,
        relationship="Member",
        occupancy_type="FAMILY_MEMBER",
        effective_date=date(2026, 2, 1),
    )
    assert ended.valid_to == date(2026, 1, 31)
    assert created.valid_from == date(2026, 2, 1)

    first_unit = HousingUnit.objects.create(label="First unit", created_by=actor)
    second_unit = HousingUnit.objects.create(label="Second unit", created_by=actor)
    _, first_occupancy = move_household(
        actor=actor,
        household=second,
        housing_unit=first_unit,
        effective_date=date(2026, 2, 1),
    )
    old, current = move_household(
        actor=actor,
        household=second,
        housing_unit=second_unit,
        effective_date=date(2026, 3, 1),
    )
    assert old.pk == first_occupancy.pk
    assert old.valid_to == date(2026, 2, 28)
    assert current.valid_from == date(2026, 3, 1)


@pytest.mark.django_db
def test_assignment_rejects_a_second_current_membership(django_user_model):
    actor = django_user_model.objects.create_user(username="synthetic-conflict")
    definition = FormDefinition.objects.create(
        module="residents", name="Synthetic conflict", created_by=actor
    )
    resident = Resident.objects.create(
        form_definition=definition,
        given_name="Synthetic",
        family_name="Conflict",
        created_by=actor,
    )
    first = Household.objects.create(label="First", created_by=actor)
    second = Household.objects.create(label="Second", created_by=actor)
    assign_resident(
        actor=actor,
        resident=resident,
        household=first,
        relationship="Member",
        occupancy_type="FAMILY_MEMBER",
        effective_date=date(2026, 1, 1),
    )
    with pytest.raises(HouseholdWorkflowError, match="Transfer it instead"):
        assign_resident(
            actor=actor,
            resident=resident,
            household=second,
            relationship="Member",
            occupancy_type="FAMILY_MEMBER",
            effective_date=date(2026, 2, 1),
        )
