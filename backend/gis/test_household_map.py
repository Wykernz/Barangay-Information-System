"""PostGIS integration tests; run explicitly with the native GIS runtime enabled."""

import uuid

import pytest
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from households.models import Household, HouseholdOccupancy, HousingUnit

pytestmark = [
    pytest.mark.django_db,
    pytest.mark.skipif(not settings.GIS_ENABLED, reason="Requires PostGIS, GDAL and GEOS"),
]


def test_household_location_roundtrip_revision_conflict_and_shared_house():
    from gis.models import HousingLocation

    actor = get_user_model().objects.create_superuser(username="synthetic-map-admin")
    client = APIClient()
    client.force_authenticate(actor)
    unit = HousingUnit.objects.create(label="Synthetic house")
    first = Household.objects.create(label="Synthetic household A")
    second = Household.objects.create(label="Synthetic household B")
    for household in (first, second):
        HouseholdOccupancy.objects.create(
            household=household, housing_unit=unit, valid_from=timezone.localdate()
        )
    url = f"/api/v1/gis/households/{first.pk}/location/"
    # Deliberately arbitrary test-only point; not a resident's actual location.
    payload = {
        "latitude": 1.25,
        "longitude": 2.5,
        "source": "Synthetic integration test",
        "expected_location": None,
        "expected_housing_unit": str(unit.pk),
    }
    saved = client.post(url, payload, format="json")
    assert saved.status_code == 201
    revision = saved.data["location"]["id"]
    assert saved.data["location"]["longitude"] == 2.5
    shared = client.get(f"/api/v1/gis/households/{second.pk}/")
    assert shared.data["location"]["id"] == revision
    assert client.post(url, payload, format="json").status_code == 409
    payload.update(expected_location=revision, longitude=2.75)
    corrected = client.post(url, payload, format="json")
    assert corrected.status_code == 201
    assert HousingLocation.objects.get(pk=revision).superseded_by_id == uuid.UUID(
        corrected.data["location"]["id"]
    )
    assert HousingLocation.objects.count() == 2
    assert corrected.data["location"]["verification_status"] == "unverified"
    assert Household.objects.count() == 2


def test_no_housing_assignment_rejects_save_and_permissions_are_required():
    actor = get_user_model().objects.create_superuser(username="synthetic-map-admin")
    household = Household.objects.create(label="Synthetic unassigned household")
    client = APIClient()
    client.force_authenticate(actor)
    url = f"/api/v1/gis/households/{household.pk}/location/"
    assert (
        client.post(
            url,
            {
                "latitude": 1,
                "longitude": 2,
                "source": "Synthetic test",
                "expected_location": None,
                "expected_housing_unit": str(uuid.uuid4()),
            },
            format="json",
        ).status_code
        == 400
    )
    reader = get_user_model().objects.create_user(username="synthetic-unprivileged")
    client.force_authenticate(reader)
    assert client.get(f"/api/v1/gis/households/{household.pk}/").status_code == 403
