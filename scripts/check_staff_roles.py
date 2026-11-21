"""Exercise actual role/session/API isolation using synthetic accounts, always rolled back."""

import os
import sys
from io import StringIO
from pathlib import Path
from unittest.mock import patch
from uuid import uuid4

from dev import load_environment


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    load_environment(root / "backend/.env")
    sys.path.insert(0, str(root / "backend"))
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    import django

    django.setup()
    from accounts.models import User
    from accounts.roles import assign_staff_role
    from django.conf import settings
    from django.contrib.auth.models import Group
    from django.core.exceptions import ValidationError
    from django.core.management import call_command
    from django.core.management.base import CommandError
    from django.db import connection, transaction
    from django.test import Client
    from django.utils.crypto import get_random_string

    if (
        not settings.DEBUG
        or connection.vendor != "postgresql"
        or settings.DATABASES["default"]["HOST"] not in ("localhost", "127.0.0.1")
    ):
        raise SystemExit("This check requires a local PostgreSQL development database.")
    ids = []
    with transaction.atomic():
        healthcare_name = "synthetic-health-" + uuid4().hex[:12]
        password = get_random_string(28) + "!Aa1"
        with (
            patch(
                "accounts.management.commands.create_staff_account.sys.stdin.isatty",
                return_value=True,
            ),
            patch(
                "accounts.management.commands.create_staff_account.getpass",
                side_effect=[password, password],
            ),
        ):
            call_command(
                "create_staff_account",
                healthcare_name,
                "healthcare_admin",
                display_name="Health Center Admin",
                stdout=StringIO(),
            )
        healthcare = User.objects.get(username=healthcare_name)
        assert healthcare.check_password(password)
        assert healthcare.get_full_name() == "Health Center Admin"
        with (
            patch(
                "accounts.management.commands.create_staff_account.sys.stdin.isatty",
                return_value=True,
            ),
            patch(
                "accounts.management.commands.create_staff_account.getpass",
                side_effect=AssertionError("Must not prompt for an existing account"),
            ),
        ):
            try:
                call_command(
                    "create_staff_account",
                    healthcare_name,
                    "healthcare_admin",
                    stdout=StringIO(),
                )
            except CommandError:
                pass
            else:
                raise AssertionError("Existing account was not protected.")
        barangay = User.objects.create_user(
            username="synthetic-barangay-" + uuid4().hex[:12]
        )
        ids = [healthcare.pk, barangay.pk]
        barangay = assign_staff_role(user=barangay, role="barangay_admin")
        client = Client(raise_request_exception=False, HTTP_HOST="localhost")
        client.force_login(healthcare)
        assert client.get("/api/v1/session/").json()["health_only"] is True
        assert (
            client.get("/api/v1/session/").json()["display_name"]
            == "Health Center Admin"
        )
        assert client.get("/api/v1/health/workspace/").status_code == 200
        for path in (
            "/api/v1/residents/",
            "/api/v1/households/",
            "/api/v1/gis/config/",
            "/api/v1/schema/",
            "/admin/",
        ):
            assert client.get(path).status_code == 403, "Healthcare isolation failed."
        client.force_login(barangay)
        assert client.get("/api/v1/session/").json()["health_only"] is False
        assert client.get("/api/v1/health/workspace/").status_code == 200
        # Random UUID ensures no existing resident/household record is fetched.
        assert client.get(f"/api/v1/households/{uuid4()}/").status_code == 404
        assert not barangay.has_perm("households.delete_household")
        assert not barangay.has_perm("accounts.change_user")
        group = Group.objects.get(name="Healthcare Administrators")
        barangay.groups.add(group)
        assert client.get("/api/v1/residents/").status_code == 403
        privileged = User.objects.create_user(
            username="synthetic-privileged-" + uuid4().hex[:12],
            is_staff=True,
            is_superuser=True,
        )
        ids.append(privileged.pk)
        try:
            assign_staff_role(user=privileged, role="healthcare_admin")
        except ValidationError:
            pass
        else:
            raise AssertionError(
                "Privileged account cannot become a healthcare-only account."
            )
        transaction.set_rollback(True)
    assert not User.objects.filter(pk__in=ids).exists()
    print(
        "PASS: PostgreSQL role grants, session routing, health access, direct API denial and conflicting-role isolation. All synthetic changes rolled back."
    )


if __name__ == "__main__":
    main()
