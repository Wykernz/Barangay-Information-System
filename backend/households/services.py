"""Transactional household membership and housing occupancy workflows."""

from datetime import date, timedelta

from django.db import transaction

from profiling.models import Resident

from .models import Household, HouseholdMembership, HouseholdOccupancy, HousingUnit


class HouseholdWorkflowError(ValueError):
    pass


def _previous_day(effective_date: date) -> date:
    return effective_date - timedelta(days=1)


@transaction.atomic
def assign_resident(
    *,
    actor,
    resident: Resident,
    household: Household,
    relationship: str,
    occupancy_type: str,
    effective_date: date,
    is_head: bool = False,
) -> HouseholdMembership:
    # Lock the stable parent row so two first-time assignments cannot both pass
    # an empty membership query concurrently.
    Resident.objects.select_for_update().get(pk=resident.pk)
    current = list(
        HouseholdMembership.objects.select_for_update()
        .filter(resident=resident, valid_from__lte=effective_date)
        .filter(valid_to__isnull=True)
    )
    if current:
        raise HouseholdWorkflowError(
            "Resident already has a current household membership. Transfer it instead."
        )
    return HouseholdMembership.objects.create(
        resident=resident,
        household=household,
        relationship=relationship,
        occupancy_type=occupancy_type,
        is_head=is_head,
        valid_from=effective_date,
        created_by=actor,
    )


@transaction.atomic
def end_membership(
    *, actor, membership: HouseholdMembership, effective_date: date
) -> HouseholdMembership:
    locked = HouseholdMembership.objects.select_for_update().get(pk=membership.pk)
    if locked.valid_to is not None:
        raise HouseholdWorkflowError("This membership is already closed.")
    if effective_date < locked.valid_from:
        raise HouseholdWorkflowError("End date must not precede the membership start date.")
    locked.valid_to = effective_date
    locked.save(update_fields=("valid_to", "updated_at"))
    return locked


@transaction.atomic
def transfer_resident(
    *,
    actor,
    membership: HouseholdMembership,
    destination_household: Household,
    relationship: str,
    occupancy_type: str,
    effective_date: date,
    is_head: bool = False,
) -> tuple[HouseholdMembership, HouseholdMembership]:
    locked = HouseholdMembership.objects.select_for_update().get(pk=membership.pk)
    if locked.valid_to is not None:
        raise HouseholdWorkflowError("Only a current membership can be transferred.")
    if destination_household.pk == locked.household_id:
        raise HouseholdWorkflowError("Choose a different destination household.")
    if effective_date <= locked.valid_from:
        raise HouseholdWorkflowError(
            "Transfer date must be later than the current membership start date."
        )
    locked.valid_to = _previous_day(effective_date)
    locked.save(update_fields=("valid_to", "updated_at"))
    created = HouseholdMembership.objects.create(
        resident=locked.resident,
        household=destination_household,
        relationship=relationship,
        occupancy_type=occupancy_type,
        is_head=is_head,
        valid_from=effective_date,
        created_by=actor,
    )
    return locked, created


@transaction.atomic
def move_household(
    *,
    actor,
    household: Household,
    housing_unit: HousingUnit,
    effective_date: date,
) -> tuple[HouseholdOccupancy | None, HouseholdOccupancy]:
    # Lock the household even when it has no occupancy yet. Row locks on an
    # empty child query would not serialize concurrent first assignments.
    Household.objects.select_for_update().get(pk=household.pk)
    current = list(
        HouseholdOccupancy.objects.select_for_update().filter(
            household=household, valid_to__isnull=True
        )
    )
    if len(current) > 1:
        raise HouseholdWorkflowError(
            "Multiple current housing assignments require administrative review."
        )
    ended = current[0] if current else None
    if ended:
        if ended.housing_unit_id == housing_unit.pk:
            raise HouseholdWorkflowError("This household already occupies that housing unit.")
        if effective_date <= ended.valid_from:
            raise HouseholdWorkflowError(
                "Move date must be later than the current occupancy start date."
            )
        ended.valid_to = _previous_day(effective_date)
        ended.save(update_fields=("valid_to", "updated_at"))
    created = HouseholdOccupancy.objects.create(
        household=household,
        housing_unit=housing_unit,
        valid_from=effective_date,
        created_by=actor,
    )
    return ended, created
