from rest_framework import serializers

from .models import Household, HouseholdMembership, HouseholdOccupancy, HousingUnit


class HouseholdSerializer(serializers.ModelSerializer):
    active_member_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Household
        fields = (
            "id",
            "reference",
            "label",
            "is_active",
            "established_on",
            "closed_on",
            "active_member_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "reference", "created_at", "updated_at")


class HousingUnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = HousingUnit
        fields = (
            "id",
            "reference",
            "label",
            "house_number",
            "address_text",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "reference", "created_at", "updated_at")


class EffectivePeriodSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        start = attrs.get("valid_from", getattr(self.instance, "valid_from", None))
        end = attrs.get("valid_to", getattr(self.instance, "valid_to", None))
        if start and end and end < start:
            raise serializers.ValidationError({"valid_to": "End date must not precede start date."})
        return attrs


class HouseholdMembershipSerializer(EffectivePeriodSerializer):
    class Meta:
        model = HouseholdMembership
        fields = (
            "id",
            "resident",
            "household",
            "relationship",
            "is_head",
            "valid_from",
            "valid_to",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class HouseholdOccupancySerializer(EffectivePeriodSerializer):
    class Meta:
        model = HouseholdOccupancy
        fields = (
            "id",
            "household",
            "housing_unit",
            "valid_from",
            "valid_to",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")
