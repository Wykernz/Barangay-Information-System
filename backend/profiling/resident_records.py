"""Resident writes and photo/revision history share one database transaction."""

from typing import Any

from django.contrib.auth.base_user import AbstractBaseUser
from django.db import transaction

from .base_contract import base_resident_contract
from .models import Resident, ResidentRevision
from .photos import resident_photo_path, resident_photo_storage


def resident_snapshot(resident: Resident) -> dict[str, Any]:
    return {
        **{
            name: getattr(resident, name)
            for name in (
                "reference",
                "given_name",
                "middle_name",
                "family_name",
                "suffix",
                "values",
                "verification_status",
                "sex",
                "civil_status",
                "nationality",
                "place_of_birth",
                "contact_number",
                "email",
                "residency_classification",
                "residency_status",
                "record_status",
                "purok",
                "is_archived",
            )
        },
        "form_definition": str(resident.form_definition_id),
        "birth_date": resident.birth_date.isoformat() if resident.birth_date else None,
        "photo": resident.photo.name,
    }


def save_resident_profile(
    *,
    actor: AbstractBaseUser,
    validated_data: dict[str, Any],
    instance: Resident | None = None,
) -> Resident:
    data = dict(validated_data)
    upload = data.pop("photo", None)
    stored = None
    try:
        with transaction.atomic():
            if instance is None and "form_definition" not in data:
                data["form_definition"] = base_resident_contract(actor)
            if upload is not None:
                stored = resident_photo_storage().save(resident_photo_path(instance, ""), upload)
                data["photo"] = stored
            if instance is None:
                resident = Resident.objects.create(created_by=actor, **data)
            else:
                resident = instance
                for name, value in data.items():
                    setattr(resident, name, value)
                resident.save()
            ResidentRevision.objects.create(
                resident=resident,
                changed_by=actor,
                snapshot=resident_snapshot(resident),
            )
        return resident
    except Exception:
        # Compensate only the new file. Existing photo/revision history is retained.
        if stored:
            resident_photo_storage().delete(stored)
        raise
