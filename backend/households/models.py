import secrets

from django.db import models
from django.db.models import Q
from django.utils import timezone

from common.models import RecordedByModel

OCCUPANCY_TYPES = (
    ("OWNER", "Owner"),
    ("FAMILY_MEMBER", "Family member"),
    ("RENTER", "Renter"),
    ("BOARDER", "Boarder"),
    ("TEMPORARY_OCCUPANT", "Temporary occupant"),
    ("OTHER", "Other"),
)


def generate_household_reference() -> str:
    return f"HH-{secrets.token_hex(5).upper()}"


def generate_housing_reference() -> str:
    return f"HU-{secrets.token_hex(5).upper()}"


class Household(RecordedByModel):
    reference = models.CharField(
        max_length=20, unique=True, default=generate_household_reference, editable=False
    )
    label = models.CharField(max_length=150)
    # These provisional fields already exist in the deployed development schema.
    # Keep them optional until the controlled vocabularies are stakeholder-approved.
    address_text = models.CharField(max_length=500, blank=True)
    purok_sitio = models.CharField(max_length=150, blank=True)
    sanitation_type = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        choices=(
            ("FLUSH_SEPTIC", "Flush-type toilet with septic tank"),
            ("CLOSED_PIT", "Closed pit"),
            ("OPEN_PIT", "Open pit"),
            ("OTHER", "Other"),
            ("NONE", "None"),
        ),
    )
    water_source = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        choices=(("LEVEL_I", "Level I"), ("LEVEL_II", "Level II"), ("LEVEL_III", "Level III")),
    )
    is_active = models.BooleanField(default=True)
    established_on = models.DateField(null=True, blank=True)
    closed_on = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ("label", "id")
        constraints = [
            models.CheckConstraint(
                condition=Q(closed_on__isnull=True)
                | Q(established_on__isnull=True)
                | Q(closed_on__gte=models.F("established_on")),
                name="household_dates_valid",
            )
        ]

    def __str__(self) -> str:
        return f"{self.reference} · {self.label}"


class HousingUnit(RecordedByModel):
    reference = models.CharField(
        max_length=20, unique=True, default=generate_housing_reference, editable=False
    )
    label = models.CharField(max_length=150)
    house_number = models.CharField(max_length=50, blank=True, default="")
    address_text = models.CharField(max_length=500, blank=True)
    property_type = models.CharField(
        max_length=30,
        choices=(
            ("PRIVATE_HOME", "Private home"),
            ("RENTAL_PROPERTY", "Rental property"),
            ("BOARDING_HOUSE", "Boarding house"),
            ("OTHER", "Other"),
        ),
        default="PRIVATE_HOME",
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ("label", "id")

    def __str__(self) -> str:
        return f"{self.reference} · {self.label}"


class EffectivePeriodModel(RecordedByModel):
    valid_from = models.DateField(default=timezone.localdate)
    valid_to = models.DateField(null=True, blank=True)

    class Meta:
        abstract = True
        constraints = [
            models.CheckConstraint(
                condition=Q(valid_to__isnull=True) | Q(valid_to__gte=models.F("valid_from")),
                name="%(class)s_dates_valid",
            )
        ]


class HouseholdMembership(EffectivePeriodModel):
    resident = models.ForeignKey(
        "profiling.Resident", on_delete=models.PROTECT, related_name="memberships"
    )
    household = models.ForeignKey(Household, on_delete=models.PROTECT, related_name="memberships")
    relationship = models.CharField(max_length=100, blank=True)
    is_head = models.BooleanField(default=False)
    occupancy_type = models.CharField(
        max_length=30, choices=OCCUPANCY_TYPES, default="FAMILY_MEMBER"
    )

    class Meta(EffectivePeriodModel.Meta):
        ordering = ("-valid_from", "-created_at")
        indexes = [models.Index(fields=("resident", "valid_to"), name="membership_current")]
        constraints = [
            *EffectivePeriodModel.Meta.constraints,
            models.CheckConstraint(
                condition=Q(occupancy_type__in=tuple(value for value, _ in OCCUPANCY_TYPES)),
                name="membership_occupancy_type_valid",
            ),
        ]


class HousingOccupant(EffectivePeriodModel):
    resident = models.ForeignKey(
        "profiling.Resident", on_delete=models.PROTECT, related_name="housing_occupancies"
    )
    housing_unit = models.ForeignKey(
        HousingUnit, on_delete=models.PROTECT, related_name="resident_occupancies"
    )
    occupancy_type = models.CharField(max_length=30, choices=OCCUPANCY_TYPES, default="OTHER")

    class Meta(EffectivePeriodModel.Meta):
        ordering = ("-valid_from", "-created_at")
        indexes = [models.Index(fields=("resident", "valid_to"), name="housing_occupant_current")]
        constraints = [
            *EffectivePeriodModel.Meta.constraints,
            models.CheckConstraint(
                condition=Q(occupancy_type__in=tuple(value for value, _ in OCCUPANCY_TYPES)),
                name="housing_occupant_type_valid",
            ),
        ]


class HouseholdOccupancy(EffectivePeriodModel):
    household = models.ForeignKey(Household, on_delete=models.PROTECT, related_name="occupancies")
    housing_unit = models.ForeignKey(
        HousingUnit, on_delete=models.PROTECT, related_name="occupancies"
    )

    class Meta(EffectivePeriodModel.Meta):
        ordering = ("-valid_from", "-created_at")
        indexes = [models.Index(fields=("household", "valid_to"), name="occupancy_current")]
