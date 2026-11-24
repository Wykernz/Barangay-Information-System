"""Smoke-check resident creation, update, verification and overview with rollback."""

import os
import sys
from pathlib import Path
from uuid import uuid4

from dev import load_environment


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    load_environment(root / "backend" / ".env")
    sys.path.insert(0, str(root / "backend"))
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

    import django

    django.setup()

    from accounts.models import User
    from accounts.roles import assign_staff_role
    from django.conf import settings
    from django.db import connection, transaction
    from profiling.models import Resident
    from rest_framework.test import APIClient

    if (
        not settings.DEBUG
        or connection.vendor != "postgresql"
        or settings.DATABASES["default"]["HOST"] not in ("localhost", "127.0.0.1")
    ):
        raise SystemExit("This check requires a local PostgreSQL development database.")

    record_id = None
    with transaction.atomic():
        user = User.objects.create_user(username=f"synthetic-profile-{uuid4().hex[:12]}")
        assign_staff_role(user=user, role="barangay_admin")
        client = APIClient(HTTP_HOST="localhost")
        client.force_authenticate(user=user)

        before = client.get("/api/v1/overview/")
        assert before.status_code == 200, f"Overview failed: HTTP {before.status_code}."
        for metric in (
            "age_groups",
            "household_sizes",
            "water_sources",
            "sanitation",
            "data_quality",
        ):
            assert metric in before.data, f"Overview is missing {metric}."

        created = client.post(
            "/api/v1/residents/",
            {
                "given_name": "Synthetic",
                "family_name": "Backend Check",
                "birth_date": "1990-01-01",
            },
            format="json",
        )
        assert created.status_code == 201, f"Resident create failed: {created.data}."
        record_id = created.data["id"]
        assert created.data["age"] is not None
        assert created.data["reference"]

        duplicate_check = client.post(
            "/api/v1/residents/duplicate-check/",
            {
                "given_name": "Synthetic",
                "family_name": "Backend Check",
                "birth_date": "1990-01-01",
            },
            format="json",
        )
        assert duplicate_check.status_code == 200, (
            f"Resident duplicate check failed: {duplicate_check.data}."
        )
        assert any(
            str(candidate["resident_id"]) == str(record_id)
            for candidate in duplicate_check.data["candidates"]
        )

        updated = client.patch(
            f"/api/v1/residents/{record_id}/",
            {"contact_number": "synthetic-test-contact"},
            format="json",
        )
        assert updated.status_code == 200, f"Resident update failed: {updated.data}."
        assert updated.data["contact_number"] == "synthetic-test-contact"

        verified = client.post(f"/api/v1/residents/{record_id}/verify/", format="json")
        assert verified.status_code == 200, f"Resident verify failed: {verified.data}."
        assert verified.data["verification_status"] == "verified"

        after = client.get("/api/v1/overview/")
        assert after.status_code == 200, f"Overview failed after save: HTTP {after.status_code}."
        assert after.data["registered_persons"] == before.data["registered_persons"] + 1
        household = client.post(
            "/api/v1/households/", {"label": "Synthetic history check"}, format="json"
        )
        assert household.status_code == 201, household.data
        destination = client.post(
            "/api/v1/households/", {"label": "Synthetic transfer target"}, format="json"
        )
        assert destination.status_code == 201, destination.data
        housing = client.post(
            "/api/v1/housing-units/", {"label": "Synthetic housing check"}, format="json"
        )
        assert housing.status_code == 201, housing.data
        destination_unit = client.post(
            "/api/v1/housing-units/", {"label": "Synthetic move target"}, format="json"
        )
        assert destination_unit.status_code == 201, destination_unit.data
        membership = client.post(
            f"/api/v1/households/{household.data['id']}/members/",
            {
                "resident": record_id,
                "relationship": "Member",
                "effective_date": "2026-01-01",
            },
            format="json",
        )
        assert membership.status_code == 201, membership.data
        transferred = client.post(
            f"/api/v1/household-memberships/{membership.data['id']}/transfer/",
            {
                "destination_household": destination.data["id"],
                "relationship": "Member",
                "effective_date": "2026-02-01",
            },
            format="json",
        )
        assert transferred.status_code == 200, transferred.data
        assert transferred.data["ended_membership"]["valid_to"] == "2026-01-31"
        assert transferred.data["created_membership"]["valid_from"] == "2026-02-01"
        moved = client.post(
            f"/api/v1/households/{destination.data['id']}/move/",
            {"housing_unit": housing.data["id"], "effective_date": "2026-02-01"},
            format="json",
        )
        assert moved.status_code == 200, moved.data
        moved_again = client.post(
            f"/api/v1/households/{destination.data['id']}/move/",
            {
                "housing_unit": destination_unit.data["id"],
                "effective_date": "2026-03-01",
            },
            format="json",
        )
        assert moved_again.status_code == 200, moved_again.data
        assert moved_again.data["ended_occupancy"]["valid_to"] == "2026-02-28"
        for endpoint, period_id in (
            (
                "household-memberships",
                transferred.data["created_membership"]["id"],
            ),
            (
                "household-occupancies",
                moved_again.data["created_occupancy"]["id"],
            ),
        ):
            url = f"/api/v1/{endpoint}/{period_id}/"
            rewrite = client.patch(url, {"valid_from": "2025-01-01"}, format="json")
            assert rewrite.status_code == 400, rewrite.data
            closed = client.patch(url, {"valid_to": "2026-04-01"}, format="json")
            assert closed.status_code == 200, closed.data
            reopened = client.patch(url, {"valid_to": None}, format="json")
            assert reopened.status_code == 400, reopened.data
            changed = client.patch(url, {"valid_to": "2026-05-01"}, format="json")
            assert changed.status_code == 400, changed.data
            preserved = client.get(url)
            assert preserved.status_code == 200, preserved.data
            assert preserved.data["valid_from"] in ("2026-02-01", "2026-03-01")
            assert preserved.data["valid_to"] == "2026-04-01"
        transaction.set_rollback(True)

    assert record_id and not User.objects.filter(username=user.username).exists()
    assert not Resident.objects.filter(pk=record_id).exists()
    print(
        "PASS: synthetic resident workflow, overview, membership and occupancy history; "
        "all account, resident, form, revision and audit changes rolled back."
    )


if __name__ == "__main__":
    main()
