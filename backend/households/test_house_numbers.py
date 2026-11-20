from types import SimpleNamespace
from unittest.mock import Mock

from rest_framework.test import APIRequestFactory, force_authenticate

from .models import Household, HousingUnit
from .serializers import HousingUnitSerializer
from .views import HousingUnitViewSet


def test_house_number_is_optional_text_not_an_automatic_sequence():
    unit = HousingUnit(label="Synthetic unit")
    assert unit.house_number == ""
    serializer = HousingUnitSerializer(instance=unit, data={"house_number": "12-A"}, partial=True)
    assert serializer.is_valid(), serializer.errors
    assert serializer.validated_data["house_number"] == "12-A"
    assert "house_number" not in {field.name for field in Household._meta.get_fields()}


def test_overlong_number_rejected_and_unnumbered_supported():
    invalid = HousingUnitSerializer(data={"house_number": "a" * 51}, partial=True)
    assert not invalid.is_valid()
    blank = HousingUnitSerializer(data={"house_number": ""}, partial=True)
    assert blank.is_valid(), blank.errors


def test_number_update_requires_server_housing_unit_change_permission():
    request = APIRequestFactory().patch(
        "/api/v1/housing-units/synthetic/", {"house_number": "12-A"}
    )
    user = SimpleNamespace(is_authenticated=True, has_perms=Mock(return_value=False))
    force_authenticate(request, user=user)
    response = HousingUnitViewSet.as_view({"patch": "partial_update"})(request, pk="synthetic")
    assert response.status_code == 403
    user.has_perms.assert_called_with(["households.change_housingunit"])
