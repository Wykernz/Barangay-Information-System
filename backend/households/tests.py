from datetime import date

from .models import Household, HouseholdMembership
from .serializers import (
    HouseholdMembershipSerializer,
    HouseholdSerializer,
    HousingUnitSerializer,
)


def test_registry_serializers_supply_defaults_for_provisional_columns():
    household = HouseholdSerializer(data={"label": "Synthetic household"})
    assert household.is_valid(), household.errors
    instance = Household(**household.validated_data)
    assert instance.address_text == ""
    assert instance.purok_sitio == ""
    assert instance.sanitation_type is None
    assert instance.water_source is None

    housing = HousingUnitSerializer(data={"label": "Synthetic housing unit"})
    assert housing.is_valid(), housing.errors
    assert housing.validated_data.get("property_type", "PRIVATE_HOME") == "PRIVATE_HOME"


def test_household_rejects_reverse_dates():
    serializer = HouseholdSerializer(data={
        "label": "Synthetic household",
        "established_on": "2026-11-20",
        "closed_on": "2026-11-19",
    })
    assert not serializer.is_valid()
    assert "closed_on" in serializer.errors


def test_household_partial_update_checks_existing_establishment():
    household = Household(label="Synthetic household", established_on=date(2026, 11, 20))
    serializer = HouseholdSerializer(household, data={"closed_on": "2026-11-19"}, partial=True)
    assert not serializer.is_valid()
    assert "closed_on" in serializer.errors


def test_household_allows_unknown_establishment_date():
    serializer = HouseholdSerializer(data={
        "label": "Synthetic household", "closed_on": "2026-11-19",
    })
    assert serializer.is_valid(), serializer.errors


def test_effective_period_rejects_reverse_dates():
    serializer = HouseholdMembershipSerializer(
        data={"valid_from": "2026-11-20", "valid_to": "2026-11-19"},
        partial=True,
    )
    assert not serializer.is_valid()
    assert "valid_to" in serializer.errors


def test_membership_history_cannot_change_start_or_head():
    membership = HouseholdMembership(valid_from=date(2026, 11, 20), is_head=False)
    serializer = HouseholdMembershipSerializer(
        membership, data={"valid_from": "2026-11-19", "is_head": True}, partial=True,
    )
    assert not serializer.is_valid()
    assert "valid_from" in serializer.errors
    assert "is_head" in serializer.errors


def test_membership_can_close_but_cannot_reopen():
    membership = HouseholdMembership(valid_from=date(2026, 11, 20))
    serializer = HouseholdMembershipSerializer(
        membership, data={"valid_to": "2026-11-21"}, partial=True,
    )
    assert serializer.is_valid(), serializer.errors
    membership.valid_to = date(2026, 11, 21)
    serializer = HouseholdMembershipSerializer(
        membership, data={"valid_to": None}, partial=True,
    )
    assert not serializer.is_valid()
    assert "valid_to" in serializer.errors
