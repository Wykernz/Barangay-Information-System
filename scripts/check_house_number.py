"""Validate numbering in local PostgreSQL using synthetic rows, always rolled back."""

import os
import sys
from pathlib import Path

from dev import load_environment


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    load_environment(root / "backend/.env")
    sys.path.insert(0, str(root / "backend"))
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    import django

    django.setup()
    from django.conf import settings
    from django.db import connection, transaction
    from django.utils import timezone
    from households.map_views import household_map_row
    from households.models import Household, HouseholdOccupancy, HousingUnit
    from households.serializers import HousingUnitSerializer

    if (
        not settings.DEBUG
        or connection.vendor != "postgresql"
        or settings.DATABASES["default"]["HOST"] not in ("localhost", "127.0.0.1")
    ):
        raise SystemExit(
            "This synthetic check requires a local PostgreSQL development database."
        )
    with connection.cursor() as cursor:
        columns = connection.introspection.get_table_description(
            cursor, HousingUnit._meta.db_table
        )
    model_columns = {field.column for field in HousingUnit._meta.concrete_fields}
    unknown_required = [
        column.name
        for column in columns
        if column.name not in model_columns
        and not column.null_ok
        and column.default is None
    ]
    if unknown_required:
        raise SystemExit(
            "BLOCKED: pre-existing required database columns are absent from the housing model: "
            + ", ".join(unknown_required)
            + ". No synthetic rows inserted; schema repair requires review."
        )
    with transaction.atomic():
        unit = HousingUnit.objects.create(
            label="Synthetic numbering validation (rolled back)"
        )
        assert unit.house_number == ""
        households = [
            Household.objects.create(label=f"Synthetic numbering household {index}")
            for index in (1, 2)
        ]
        for household in households:
            HouseholdOccupancy.objects.create(
                household=household, housing_unit=unit, valid_from=timezone.localdate()
            )
        serializer = HousingUnitSerializer(
            unit, data={"house_number": "SYN-12A"}, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        unit.refresh_from_db()
        assert unit.house_number == "SYN-12A"
        assert all(
            household_map_row(household)["house_number"] == "SYN-12A"
            for household in households
        )
        identifiers = [household.pk for household in households]
        unit_id = unit.pk
        transaction.set_rollback(True)
    assert not HousingUnit.objects.filter(pk=unit_id).exists()
    assert not Household.objects.filter(pk__in=identifiers).exists()
    print(
        "PASS: PostgreSQL house-number save/read and shared-house links; all synthetic rows rolled back."
    )


if __name__ == "__main__":
    main()
