"""Local PostgreSQL resident/photo/access smoke check; all synthetic writes roll back."""

import os
import sys
from datetime import date
from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory
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
    from django.core.files.uploadedfile import SimpleUploadedFile
    from django.db import connection, transaction
    from django.test import override_settings
    from PIL import Image
    from profiling.models import FormDefinition, FormField, Resident
    from rest_framework.test import APIClient

    if (
        not settings.DEBUG
        or connection.vendor != "postgresql"
        or settings.DATABASES["default"]["HOST"] not in ("localhost", "127.0.0.1")
    ):
        raise SystemExit("Requires a local PostgreSQL development database.")

    def photo():
        image = Image.new("RGB", (32, 32), "blue")
        output = BytesIO()
        exif = Image.Exif()
        exif[270] = "Synthetic private image metadata"
        image.save(output, format="PNG", exif=exif)
        return SimpleUploadedFile(
            "private-name.png", output.getvalue(), content_type="image/png"
        )

    resident_id = None
    with (
        TemporaryDirectory(prefix="bims-synthetic-photos-") as media,
        override_settings(PRIVATE_MEDIA_ROOT=media),
        transaction.atomic(),
    ):
        staff = User.objects.create_user(
            username="synthetic-profile-" + uuid4().hex[:12]
        )
        staff = assign_staff_role(user=staff, role="barangay_admin")
        client = APIClient(HTTP_HOST="localhost")
        client.force_login(staff)
        response = client.post(
            "/api/v1/residents/",
            {
                "given_name": "Synthetic",
                "middle_name": "Only",
                "family_name": "Profile Test",
                "suffix": "III",
                "birth_date": "2000-01-01",
                "sex": "Male",
                "civil_status": "Single",
                "nationality": "Synthetic nationality",
                "place_of_birth": "Synthetic birthplace",
                "email": "test@example.invalid",
                "contact_number": "",
                "residency_classification": "Resident",
                "residency_status": "Renter",
                "record_status": "Active",
                "photo": photo(),
                "reference": "FORGED",
                "age": 99,
                "created_at": "1900-01-01T00:00:00Z",
            },
            format="multipart",
        )
        assert response.status_code == 201, (
            f"Resident creation failed: HTTP {response.status_code}"
        )
        data = response.json()
        resident_id = data["id"]
        url = f"/api/v1/residents/{resident_id}/"
        resident = Resident.objects.get(pk=resident_id)
        assert data["reference"].startswith("RES-") and data["reference"] != "FORGED"
        assert data["age"] == resident.age_at() and data["created_at"].startswith(
            str(date.today().year)
        )
        assert (
            data["record_status"] == "Active"
            and data["verification_status"] == "unverified"
        )
        first_path = resident.photo.path
        assert Path(first_path).is_file() and "private-name" not in first_path
        photo_response = client.get(data["photo_url"])
        assert photo_response.status_code == 200
        assert photo_response["Cache-Control"] == "private, no-store"
        with Image.open(BytesIO(b"".join(photo_response.streaming_content))) as image:
            assert image.format == "JPEG" and not image.getexif()
        assert client.get(url).json()["residency_status"] == "Renter"
        updated = client.patch(
            url, {"photo": photo(), "record_status": "Moved out"}, format="multipart"
        )
        assert updated.status_code == 200
        resident.refresh_from_db()
        assert resident.photo.path != first_path and Path(first_path).is_file()
        assert resident.revisions.count() == 2
        assert resident.revisions.order_by("changed_at", "id").first().snapshot[
            "photo"
        ] in first_path.replace("\\", "/")
        assert client.patch(url, {"email": "bad"}, format="json").status_code == 400
        assert (
            client.patch(url, {"birth_date": "2999-01-01"}, format="json").status_code
            == 400
        )
        assert (
            client.patch(url, {"is_archived": True}, format="json").status_code == 200
        )
        assert client.get(url).json()["is_archived"] is True
        assert (
            client.patch(url, {"is_archived": False}, format="json").status_code == 200
        )
        # Fixed-field edits must preserve a custom active contract and its extension values.
        contract = FormDefinition.objects.create(
            module="residents",
            name="Synthetic test " + uuid4().hex,
            status="active",
            version=1,
        )
        FormField.objects.create(
            definition=contract,
            key="sample",
            label="Synthetic",
            position=1,
            data_type="text",
            required=True,
        )
        custom = client.post(
            "/api/v1/residents/",
            {
                "given_name": "Synthetic",
                "family_name": "Custom",
                "form_definition": str(contract.pk),
                "values": {"sample": "preserve"},
            },
            format="json",
        )
        assert custom.status_code == 201
        custom_url = f"/api/v1/residents/{custom.json()['id']}/"
        assert client.patch(
            custom_url, {"nationality": "Synthetic"}, format="json"
        ).json()["values"] == {"sample": "preserve"}
        client.logout()
        assert client.get(data["photo_url"]).status_code in (401, 403)
        ordinary = User.objects.create_user(
            username="synthetic-denied-" + uuid4().hex[:12]
        )
        client.force_login(ordinary)
        assert client.get(data["photo_url"]).status_code == 403
        assert (
            client.patch(url, {"record_status": "Deceased"}, format="json").status_code
            == 403
        )
        health = User.objects.create_user(
            username="synthetic-health-" + uuid4().hex[:12]
        )
        assign_staff_role(user=health, role="healthcare_admin")
        client.force_login(health)
        assert client.get(data["photo_url"]).status_code == 403
        transaction.set_rollback(True)
    assert not Resident.objects.filter(pk=resident_id).exists()
    print(
        "PASS: resident fields, persistence, revisions, protected photos, replacement history, validation, role isolation; synthetic writes rolled back."
    )


if __name__ == "__main__":
    main()
