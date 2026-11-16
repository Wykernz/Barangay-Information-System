from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from households.models import Household, HouseholdMembership, HouseholdOccupancy, HousingUnit
from profiling.models import FormDefinition, Resident

from .services import record_event


@receiver(post_save, sender=FormDefinition)
@receiver(post_save, sender=Resident)
@receiver(post_save, sender=Household)
@receiver(post_save, sender=HousingUnit)
@receiver(post_save, sender=HouseholdMembership)
@receiver(post_save, sender=HouseholdOccupancy)
def audit_domain_write(sender, instance, created, raw=False, **kwargs):
    if raw:
        return
    record_event(
        action=f"{sender._meta.label_lower}.{'create' if created else 'update'}", target=instance
    )


if settings.GIS_ENABLED:
    from gis.models import HousingLocation

    @receiver(post_save, sender=HousingLocation)
    def audit_gis_write(sender, instance, created, raw=False, **kwargs):
        if raw:
            return
        record_event(
            action=f"{sender._meta.label_lower}.{'create' if created else 'update'}",
            target=instance,
        )
