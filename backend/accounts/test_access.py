from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from django.http import HttpResponse

from .access import HealthWorkerIsolationMiddleware


@pytest.mark.parametrize("path", ["/api/v1/residents/", "/api/v1/households/", "/admin/"])
def test_health_worker_cannot_access_other_sections(path):
    groups = Mock()
    groups.filter.return_value.exists.return_value = True
    request = SimpleNamespace(path=path, user=SimpleNamespace(
        is_authenticated=True, groups=groups,
    ))
    downstream = Mock(return_value=HttpResponse())
    assert HealthWorkerIsolationMiddleware(downstream)(request).status_code == 403
    downstream.assert_not_called()
