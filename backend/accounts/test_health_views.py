from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from rest_framework.test import APIRequestFactory, force_authenticate

from .access import HEALTH_ACCESS_GROUPS
from .health_views import health_workspace


@pytest.mark.parametrize("granted", [True, False])
def test_health_workspace_requires_explicit_group_even_for_superuser(granted):
    groups = Mock()
    groups.filter.return_value.exists.return_value = granted
    user = SimpleNamespace(is_authenticated=True, is_superuser=True, groups=groups)
    request = APIRequestFactory().get("/api/v1/health/workspace/")
    force_authenticate(request, user=user)
    response = health_workspace(request)
    assert response.status_code == (200 if granted else 403)
    groups.filter.assert_any_call(name__in=HEALTH_ACCESS_GROUPS)
    if granted:
        assert response.data["capture_available"] is False


def test_health_workspace_rejects_anonymous_requests():
    response = health_workspace(APIRequestFactory().get("/api/v1/health/workspace/"))
    assert response.status_code == 403
