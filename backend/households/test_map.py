"""Transport, access and coordinate tests run without native GIS dependencies."""

from types import SimpleNamespace
from unittest.mock import Mock, patch

import pytest
from django.core.exceptions import ImproperlyConfigured
from django.test import override_settings
from rest_framework.test import APIRequestFactory, force_authenticate

from .map_config import map_config
from .map_views import (
    MapLocationInput,
    configuration,
    household_detail,
    household_directory,
    household_location,
    local_tile,
)


def request(method="get", data=None, allowed=False):
    req = getattr(APIRequestFactory(), method)("/api/v1/gis/households/", data, format="json")
    user = SimpleNamespace(
        is_authenticated=True, is_active=True, has_perms=Mock(return_value=allowed)
    )
    force_authenticate(req, user=user)
    return req


def test_config_defaults_and_satellite_resolution(monkeypatch):
    for key in tuple(__import__("os").environ):
        if key.startswith("GIS_STREET_") or key.startswith("GIS_SATELLITE_"):
            monkeypatch.delenv(key)
    config = map_config()
    assert config["center"] == [12.0715, 124.5922]
    assert config["zoom"] == 18
    assert config["providers"][0]["offline"] is False
    assert config["providers"][1]["max_native_zoom"] == 8
    assert "Cannot identify individual houses" in config["providers"][1]["note"]


def test_no_bulk_caching_public_osm(monkeypatch):
    monkeypatch.setenv("GIS_STREET_OFFLINE", "true")
    with pytest.raises(ImproperlyConfigured, match="locally hosted"):
        map_config()


def test_hybrid_without_key_preserves_street_map(monkeypatch):
    monkeypatch.delenv("GIS_ESRI_BROWSER_KEY", raising=False)
    config = map_config()
    hybrid = next(layer for layer in config["providers"] if layer["id"] == "hybrid")
    assert config["default_provider"] == "street"
    assert hybrid["available"] is False
    assert hybrid["access_token"] == ""


def test_hybrid_with_browser_key_becomes_default(monkeypatch):
    monkeypatch.setenv("GIS_ESRI_BROWSER_KEY", "synthetic-test-only")
    config = map_config()
    hybrid = next(layer for layer in config["providers"] if layer["id"] == "hybrid")
    assert config["default_provider"] == "hybrid"
    assert hybrid["available"] is True
    assert hybrid["engine"] == "esri"


def test_hybrid_rejects_whitespace_in_credential(monkeypatch):
    monkeypatch.setenv("GIS_ESRI_BROWSER_KEY", "synthetic invalid")
    with pytest.raises(ImproperlyConfigured, match="browser-scoped"):
        map_config()


def test_offline_requires_licence_and_local_source(monkeypatch):
    monkeypatch.setenv("GIS_STREET_URL", "/api/v1/gis/tiles/street/{z}/{x}/{y}.png")
    monkeypatch.setenv("GIS_STREET_OFFLINE", "true")
    monkeypatch.delenv("GIS_STREET_ATTRIBUTION", raising=False)
    with pytest.raises(ImproperlyConfigured, match="ATTRIBUTION"):
        map_config()
    monkeypatch.setenv("GIS_STREET_ATTRIBUTION", "© OpenStreetMap contributors")
    monkeypatch.setenv("GIS_STREET_LICENCE", "https://www.openstreetmap.org/copyright")
    assert map_config()["providers"][0]["offline"] is True


@pytest.mark.parametrize(
    "coordinates",
    [
        {"latitude": 91, "longitude": 0},
        {"latitude": 0, "longitude": 181},
        {"latitude": float("nan"), "longitude": 124.5},
        {"latitude": 12, "longitude": float("inf")},
    ],
)
def test_reject_invalid_coordinates(coordinates):
    serializer = MapLocationInput(
        data={
            **coordinates,
            "source": "Synthetic test",
            "expected_location": None,
            "expected_housing_unit": "00000000-0000-0000-0000-000000000001",
        }
    )
    assert not serializer.is_valid()


def test_location_requires_source_and_expected_revision():
    serializer = MapLocationInput(data={"latitude": 12, "longitude": 124})
    assert not serializer.is_valid()
    assert {"source", "expected_location"} <= serializer.errors.keys()


@pytest.mark.parametrize("view", [household_directory, household_detail, household_location])
def test_map_endpoints_deny_without_capabilities(view):
    args = {} if view == household_directory else {"pk": "00000000-0000-0000-0000-000000000001"}
    response = view(request("post" if view == household_location else "get"), **args)
    assert response.status_code == 403


def test_unauthenticated_config_is_denied():
    assert configuration(APIRequestFactory().get("/api/v1/gis/config/")).status_code == 403


@override_settings(GIS_ENABLED=False)
def test_disabled_gis_cannot_claim_save_success():
    response = household_location(request("post", {}, allowed=True), pk="unused")
    assert response.status_code == 503


@override_settings(GIS_ENABLED=False)
def test_house_number_permission_is_independent_of_native_gis_storage():
    response = configuration(request(allowed=True))
    assert response.data["can_number_houses"] is True
    assert response.data["can_edit"] is False


@override_settings(GIS_ENABLED=True)
def test_read_only_staff_cannot_save():
    req = request("post", {}, allowed=True)
    req.user = None
    # First check permits reads; the second denies point capture/correction.
    req._force_auth_user.has_perms.side_effect = [True, False]
    assert household_location(req, pk="unused").status_code == 403


@pytest.mark.parametrize(
    "style,z,x,filename",
    [
        ("street", 18, 1, "../../secret.png"),
        ("street", 21, 0, "0.png"),
        ("satellite", 1, 2, "0.jpg"),
        ("unknown", 0, 0, "0.png"),
    ],
)
def test_local_tiles_reject_invalid_paths(style, z, x, filename):
    response = local_tile(request(allowed=True), style, z, x, filename)
    assert response.status_code == 404


def test_detail_returns_canonical_row_without_fixture_matching():
    row = {"id": "canonical-id", "label": "Synthetic household", "location": None}
    with (
        patch("households.map_views.get_object_or_404") as get_household,
        patch("households.map_views.household_map_row", return_value=row),
    ):
        response = household_detail(request(allowed=True), pk="canonical-id")
    assert response.data == row
    assert get_household.call_args.kwargs == {"pk": "canonical-id"}
