from rest_framework import serializers

from profiling.models import Resident

from .models import Household, HouseholdMembership, HouseholdOccupancy, HousingUnit


class HouseholdSerializer(serializers.ModelSerializer):
    active_member_count = serializers.IntegerField(read_only=True)

    def validate(self, attrs):
        start = attrs.get("established_on", getattr(self.instance, "established_on", None))
        end = attrs.get("closed_on", getattr(self.instance, "closed_on", None))
        if start and end and end < start:
            raise serializers.ValidationError(
                {"closed_on": "Closure date must not precede establishment date."}
            )
        return attrs

    class Meta:
        model = Household
        fields = (
            "id",
            "reference",
            "label",
            "address_text",
            "purok_sitio",
            "sanitation_type",
            "water_source",
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
            "property_type",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "reference", "created_at", "updated_at")


class EffectivePeriodSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        if self.instance is not None:
            errors = {}
            for field, value in attrs.items():
                if field != "valid_to" and value != getattr(self.instance, field):
                    errors[field] = (
                        "Historical details cannot be rewritten; create a new dated record."
                    )
            if (
                self.instance.valid_to is not None
                and "valid_to" in attrs
                and attrs["valid_to"] != self.instance.valid_to
            ):
                errors["valid_to"] = "A closed historical record cannot be changed or reopened."
            if errors:
                raise serializers.ValidationError(errors)
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
            "occupancy_type",
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


class MembershipAssignmentSerializer(serializers.Serializer):
    resident = serializers.PrimaryKeyRelatedField(
        queryset=Resident.objects.filter(is_archived=False)
    )
    relationship = serializers.CharField(max_length=100, required=False, allow_blank=True)
    occupancy_type = serializers.ChoiceField(
        choices=HouseholdMembership._meta.get_field("occupancy_type").choices,
        default="FAMILY_MEMBER",
    )
    is_head = serializers.BooleanField(default=False)
    effective_date = serializers.DateField()


class MembershipTransferSerializer(serializers.Serializer):
    destination_household = serializers.PrimaryKeyRelatedField(
        queryset=Household.objects.filter(is_active=True)
    )
    relationship = serializers.CharField(max_length=100, required=False, allow_blank=True)
    occupancy_type = serializers.ChoiceField(
        choices=HouseholdMembership._meta.get_field("occupancy_type").choices,
        default="FAMILY_MEMBER",
    )
    is_head = serializers.BooleanField(default=False)
    effective_date = serializers.DateField()


class EffectiveDateSerializer(serializers.Serializer):
    effective_date = serializers.DateField()


class HouseholdMoveSerializer(serializers.Serializer):
    housing_unit = serializers.PrimaryKeyRelatedField(
        queryset=HousingUnit.objects.filter(is_active=True)
    )
    effective_date = serializers.DateField()


class MembershipTransferResultSerializer(serializers.Serializer):
    ended_membership = HouseholdMembershipSerializer()
    created_membership = HouseholdMembershipSerializer()


class HouseholdMoveResultSerializer(serializers.Serializer):
    ended_occupancy = HouseholdOccupancySerializer(allow_null=True)
    created_occupancy = HouseholdOccupancySerializer()
