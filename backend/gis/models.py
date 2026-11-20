from django.conf import settings
from django.contrib.gis.db import models as gis_models
from django.core.validators import MinValueValidator
from django.db import models

from common.models import RecordedByModel


class HousingLocation(RecordedByModel):
    """A point revision; absence of a row means the housing unit is unmapped."""

    class VerificationStatus(models.TextChoices):
        UNVERIFIED = "unverified", "Unverified"
        VERIFIED = "verified", "Verified"
        REJECTED = "rejected", "Rejected"

    housing_unit = models.ForeignKey(
        "households.HousingUnit", on_delete=models.PROTECT, related_name="location_revisions"
    )
    point = gis_models.PointField(srid=4326, spatial_index=True)
    source = models.CharField(max_length=200)
    collection_method = models.CharField(max_length=150)
    source_crs = models.CharField(max_length=80)
    accuracy_m = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
    )
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
    superseded_by = models.OneToOneField(
        "self", null=True, blank=True, on_delete=models.PROTECT, related_name="supersedes"
    )

    class Meta:
        ordering = ("-created_at", "-id")
        indexes = [
            models.Index(
                fields=("housing_unit", "verification_status"), name="location_unit_status"
            ),
            models.Index(fields=("superseded_by",), name="location_current"),
        ]
