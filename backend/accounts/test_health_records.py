import datetime

import pytest
from rest_framework.exceptions import ValidationError

from .access import HealthAccessPermission
from .health_records import HealthAssessmentSerializer, HealthAssessmentViewSet


def test_assessments_preserve_history_and_require_explicit_health_access():
    assert HealthAssessmentViewSet.permission_classes == (HealthAccessPermission,)
    assert not hasattr(HealthAssessmentViewSet, "update")
    assert not hasattr(HealthAssessmentViewSet, "destroy")


def test_future_assessment_is_rejected():
    with pytest.raises(ValidationError):
        HealthAssessmentSerializer().validate_assessment_date(datetime.date(2999, 1, 1))
