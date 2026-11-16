from .serializers import HouseholdMembershipSerializer


def test_effective_period_rejects_reverse_dates():
    serializer = HouseholdMembershipSerializer(
        data={"valid_from": "2026-11-20", "valid_to": "2026-11-19"},
        partial=True,
    )
    assert not serializer.is_valid()
    assert "valid_to" in serializer.errors
