from types import SimpleNamespace
from unittest.mock import Mock, patch

import pytest
from django.core.management.base import CommandError
from django.http import HttpResponse
from rest_framework.test import APIRequestFactory, force_authenticate

from .access import HealthWorkerIsolationMiddleware, health_only
from .health_views import health_workspace
from .management.commands.create_staff_account import Command


def role_user(names):
    groups = Mock()
    groups.filter.side_effect = lambda **query: SimpleNamespace(
        exists=lambda: bool(set(names) & set(query.get("name__in", ())))
    )
    return SimpleNamespace(is_authenticated=True, is_superuser=False, groups=groups)


@pytest.mark.parametrize(
    "groups,isolated",
    [
        (["Healthcare Administrators"], True),
        (["Barangay Administrators", "Health Administrators"], False),
        (["Healthcare Administrators", "Barangay Administrators", "Health Administrators"], True),
        (["Health Workers"], True),
        ([], False),
    ],
)
def test_explicit_health_only_role_and_conflicting_memberships(groups, isolated):
    assert health_only(role_user(groups)) is isolated


@pytest.mark.parametrize(
    "path",
    [
        "/api/v1/residents/",
        "/api/v1/households/",
        "/api/v1/gis/config/",
        "/api/v1/schema/",
        "/api/v1/profile-forms/",
        "/admin/",
    ],
)
def test_healthcare_admin_cannot_bypass_section_isolation(path):
    downstream = Mock(return_value=HttpResponse())
    request = SimpleNamespace(path=path, user=role_user(["Healthcare Administrators"]))
    assert HealthWorkerIsolationMiddleware(downstream)(request).status_code == 403
    downstream.assert_not_called()


@pytest.mark.parametrize(
    "path", ["/api/v1/session/", "/api/v1/auth/logout/", "/api/v1/health/workspace/"]
)
def test_healthcare_admin_can_use_health_and_session_endpoints(path):
    downstream = Mock(return_value=HttpResponse())
    request = SimpleNamespace(path=path, user=role_user(["Healthcare Administrators"]))
    assert HealthWorkerIsolationMiddleware(downstream)(request).status_code == 200


@pytest.mark.parametrize(
    "groups,status",
    [
        (["Healthcare Administrators"], 200),
        (["Barangay Administrators", "Health Administrators"], 200),
        (["Barangay Administrators"], 403),
    ],
)
def test_health_access_is_explicit_for_both_admin_roles(groups, status):
    request = APIRequestFactory().get("/api/v1/health/workspace/")
    force_authenticate(request, user=role_user(groups))
    assert health_workspace(request).status_code == status


def test_account_creation_refuses_noninteractive_password_fallback():
    with patch(
        "accounts.management.commands.create_staff_account.sys.stdin.isatty", return_value=False
    ):
        with pytest.raises(CommandError, match="interactive terminal"):
            Command().handle(username="synthetic-health-admin", role="healthcare_admin")
