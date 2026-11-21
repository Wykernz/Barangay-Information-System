from django.contrib.auth.models import AbstractUser
from django.db import models

from common.models import RecordedByModel


class User(AbstractUser):
    """Named staff accounts; domain permissions are introduced per vertical slice."""


class HealthAssessment(RecordedByModel):
    person = models.ForeignKey("profiling.Resident", on_delete=models.PROTECT,
                               related_name="health_assessments")
    assessment_date = models.DateField()
    pregnancy_notes = models.TextField(blank=True, max_length=2000)
    family_planning_notes = models.TextField(blank=True, max_length=2000)
    tb_screening_notes = models.TextField(blank=True, max_length=2000)
    other_health_notes = models.TextField(blank=True, max_length=2000)

    class Meta:
        ordering = ("-assessment_date", "-created_at", "-id")
