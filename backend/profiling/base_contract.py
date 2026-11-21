"""The explicitly requested fixed resident fields, independent of custom extensions."""

from django.contrib.auth.base_user import AbstractBaseUser
from django.db import transaction
from rest_framework.exceptions import ValidationError

from .models import FormDefinition


@transaction.atomic
def base_resident_contract(actor: AbstractBaseUser) -> FormDefinition:
    definition, _ = FormDefinition.objects.get_or_create(
        module=FormDefinition.Module.RESIDENTS,
        name="Payahan resident base fields",
        version=1,
        defaults={"status": FormDefinition.Status.ACTIVE, "created_by": actor},
    )
    if definition.status != FormDefinition.Status.ACTIVE or definition.fields.exists():
        raise ValidationError(
            "The base profile contract needs administrator review; select a custom active form."
        )
    return definition
