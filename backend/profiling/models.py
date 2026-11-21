import secrets

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from common.models import RecordedByModel

from .photos import resident_photo_path, resident_photo_storage


def generate_resident_reference() -> str:
    return f"RES-{secrets.token_hex(5).upper()}"


class FormDefinition(RecordedByModel):
    class Module(models.TextChoices):
        RESIDENTS = "residents", "Residents"
        HOUSEHOLDS = "households", "Households"
        HOUSING = "housing", "Housing"
        SURVEYS = "surveys", "Surveys"
        GIS = "gis", "GIS"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        ACTIVE = "active", "Active"
        ARCHIVED = "archived", "Archived"

    module = models.CharField(max_length=20, choices=Module.choices)
    name = models.CharField(max_length=150)
    version = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("module", "name", "version"),
                name="unique_profile_form_version",
            )
        ]
        ordering = ("module", "name", "-version")

    def __str__(self) -> str:
        return f"{self.name} v{self.version}"


class FormField(models.Model):
    class DataType(models.TextChoices):
        TEXT = "text", "Short text"
        LONG_TEXT = "long_text", "Long text"
        INTEGER = "integer", "Integer"
        DECIMAL = "decimal", "Decimal"
        BOOLEAN = "boolean", "Yes or no"
        DATE = "date", "Date"
        CHOICE = "choice", "Single choice"
        MULTI_CHOICE = "multi_choice", "Multiple choices"

    id = models.BigAutoField(primary_key=True)
    definition = models.ForeignKey(FormDefinition, on_delete=models.PROTECT, related_name="fields")
    key = models.SlugField(max_length=80)
    label = models.CharField(max_length=150)
    help_text = models.CharField(max_length=500, blank=True)
    data_type = models.CharField(max_length=20, choices=DataType.choices)
    required = models.BooleanField(default=False)
    position = models.PositiveIntegerField()
    options = models.JSONField(default=list, blank=True)
    sensitive = models.BooleanField(default=False)

    class Meta:
        ordering = ("position", "id")
        constraints = [
            models.UniqueConstraint(
                fields=("definition", "key"), name="unique_profile_form_field_key"
            ),
            models.UniqueConstraint(
                fields=("definition", "position"), name="unique_profile_form_field_position"
            ),
        ]

    def __str__(self) -> str:
        return self.label


class Resident(RecordedByModel):
    class VerificationStatus(models.TextChoices):
        UNVERIFIED = "UNVERIFIED", "Unverified"
        PENDING = "PENDING", "Pending"
        VERIFIED = "VERIFIED", "Verified"
        NEEDS_REVIEW = "NEEDS_REVIEW", "Needs review"

    reference = models.CharField(
        max_length=20, unique=True, default=generate_resident_reference, editable=False
    )
    form_definition = models.ForeignKey(
        FormDefinition, on_delete=models.PROTECT, related_name="resident_profiles"
    )
    given_name = models.CharField(max_length=150)
    middle_name = models.CharField(max_length=150, blank=True)
    family_name = models.CharField(max_length=150)
    suffix = models.CharField(max_length=50, blank=True)
    birth_date = models.DateField(null=True, blank=True)
    sex = models.CharField(
        max_length=20,
        choices=[(value, value) for value in ("Female", "Male", "Not recorded")],
        default="Not recorded",
    )
    civil_status = models.CharField(
        max_length=30,
        choices=[
            (value, value)
            for value in ("Not recorded", "Single", "Married", "Widowed", "Separated", "Other")
        ],
        default="Not recorded",
    )
    nationality = models.CharField(max_length=100, blank=True, default="")
    place_of_birth = models.CharField(max_length=150, blank=True, default="")
    contact_number = models.CharField(max_length=50, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    residency_classification = models.CharField(
        max_length=20,
        null=True,
        choices=[("RESIDENT", "Resident"), ("NON_RESIDENT", "Non-resident")],
        default=None,
    )
    residency_status = models.CharField(
        max_length=30,
        choices=[
            (value, value)
            for value in ("Not recorded", "Permanent resident", "Renter", "Boarder", "Other")
        ],
        default="Not recorded",
    )
    record_status = models.CharField(
        max_length=20,
        choices=[(value, value) for value in ("Not recorded", "Active", "Moved out", "Deceased")],
        default="Not recorded",
    )
    purok = models.CharField(max_length=50, blank=True, default="")
    is_archived = models.BooleanField(default=False)
    # Preserve legacy database columns without inventing mappings to record status.
    is_active = models.BooleanField(default=True)
    archived_at = models.DateTimeField(null=True, blank=True)
    photo = models.ImageField(
        upload_to=resident_photo_path, storage=resident_photo_storage, blank=True, default=""
    )
    values = models.JSONField(default=dict, blank=True)
    verification_status = models.CharField(
        max_length=20,
        choices=VerificationStatus.choices,
        default=VerificationStatus.UNVERIFIED,
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )

    class Meta:
        ordering = ("family_name", "given_name", "id")
        indexes = [
            models.Index(fields=("family_name", "given_name"), name="resident_name_search"),
            models.Index(fields=("verification_status",), name="resident_verification"),
        ]
        permissions = [
            ("view_sensitive_profile", "Can view fields marked sensitive"),
            ("change_sensitive_profile", "Can change fields marked sensitive"),
        ]

    @property
    def display_name(self) -> str:
        return " ".join(
            part
            for part in (self.given_name, self.middle_name, self.family_name, self.suffix)
            if part
        ).strip()

    def age_at(self, effective_date=None) -> int | None:
        if self.birth_date is None:
            return None
        effective_date = effective_date or timezone.localdate()
        return (
            effective_date.year
            - self.birth_date.year
            - (
                (effective_date.month, effective_date.day)
                < (self.birth_date.month, self.birth_date.day)
            )
        )


class ResidentRevision(models.Model):
    """Append-oriented provenance for API writes to a resident profile."""

    resident = models.ForeignKey(Resident, on_delete=models.PROTECT, related_name="revisions")
    changed_at = models.DateTimeField(auto_now_add=True)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+"
    )
    reason = models.CharField(max_length=300, blank=True)
    snapshot = models.JSONField()

    class Meta:
        ordering = ("-changed_at", "-id")
