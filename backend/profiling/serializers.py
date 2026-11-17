from django.db import transaction
from django.utils import timezone
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .models import FormDefinition, FormField, Resident, ResidentRevision
from .services import ProfileValidationError, validate_profile_values


class FormFieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormField
        fields = (
            "id",
            "key",
            "label",
            "help_text",
            "data_type",
            "required",
            "position",
            "options",
            "sensitive",
        )
        read_only_fields = ("id",)
        validators = []

    def validate_options(self, value):
        if not isinstance(value, list) or any(
            not isinstance(option, str) or not option.strip() for option in value
        ):
            raise serializers.ValidationError("Options must be a list of non-empty strings.")
        if len(value) != len(set(value)):
            raise serializers.ValidationError("Options must not contain duplicates.")
        return value

    def validate(self, attrs):
        data_type = attrs.get("data_type", getattr(self.instance, "data_type", None))
        options = attrs.get("options", getattr(self.instance, "options", []))
        if (
            data_type in (FormField.DataType.CHOICE, FormField.DataType.MULTI_CHOICE)
            and not options
        ):
            raise serializers.ValidationError(
                {"options": "Choice fields require at least one option."}
            )
        if (
            data_type not in (FormField.DataType.CHOICE, FormField.DataType.MULTI_CHOICE)
            and options
        ):
            raise serializers.ValidationError({"options": "Only choice fields may define options."})
        return attrs


class FormDefinitionSerializer(serializers.ModelSerializer):
    fields = FormFieldSerializer(many=True)

    class Meta:
        model = FormDefinition
        fields = (
            "id",
            "module",
            "name",
            "version",
            "status",
            "created_at",
            "updated_at",
            "fields",
        )
        read_only_fields = ("id", "status", "created_at", "updated_at")

    def validate_fields(self, fields):
        keys = [field["key"] for field in fields]
        positions = [field["position"] for field in fields]
        if len(keys) != len(set(keys)):
            raise serializers.ValidationError("Field keys must be unique within a form.")
        if len(positions) != len(set(positions)):
            raise serializers.ValidationError("Field positions must be unique within a form.")
        return fields

    @transaction.atomic
    def create(self, validated_data):
        fields = validated_data.pop("fields")
        definition = FormDefinition.objects.create(
            created_by=self.context["request"].user,
            status=FormDefinition.Status.DRAFT,
            **validated_data,
        )
        FormField.objects.bulk_create(
            [FormField(definition=definition, **field) for field in fields]
        )
        return definition

    @transaction.atomic
    def update(self, instance, validated_data):
        if instance.status != FormDefinition.Status.DRAFT:
            raise serializers.ValidationError("Only draft form definitions can be edited.")
        fields = validated_data.pop("fields", None)
        instance = super().update(instance, validated_data)
        if fields is not None:
            instance.fields.all().delete()
            FormField.objects.bulk_create(
                [FormField(definition=instance, **field) for field in fields]
            )
        instance.refresh_from_db()
        return instance


class ResidentSerializer(serializers.ModelSerializer):
    age = serializers.SerializerMethodField()

    class Meta:
        model = Resident
        fields = (
            "id",
            "reference",
            "form_definition",
            "given_name",
            "middle_name",
            "family_name",
            "suffix",
            "birth_date",
            "age",
            "values",
            "verification_status",
            "verified_at",
            "verified_by",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "reference",
            "age",
            "verification_status",
            "verified_at",
            "verified_by",
            "created_at",
            "updated_at",
        )

    @extend_schema_field(serializers.IntegerField(allow_null=True))
    def get_age(self, obj):
        return obj.age_at()

    def validate_form_definition(self, definition):
        if (
            definition.module != FormDefinition.Module.RESIDENTS
            or definition.status != FormDefinition.Status.ACTIVE
        ):
            raise serializers.ValidationError("Select an active resident form definition.")
        return definition

    def validate_birth_date(self, value):
        if value and value > timezone.localdate():
            raise serializers.ValidationError("Birthdate cannot be in the future.")
        return value

    def validate(self, attrs):
        definition = attrs.get("form_definition", getattr(self.instance, "form_definition", None))
        old_values = getattr(self.instance, "values", {})
        values = attrs.get("values", old_values)
        if definition is not None:
            try:
                validate_profile_values(definition.fields.all(), values)
            except ProfileValidationError as error:
                raise serializers.ValidationError({"values": error.errors}) from error

            request = self.context["request"]
            sensitive_fields = {field.key for field in definition.fields.filter(sensitive=True)}
            changed_sensitive = {
                key for key in sensitive_fields if values.get(key) != old_values.get(key)
            }
            if changed_sensitive and not request.user.has_perm(
                "profiling.change_sensitive_profile"
            ):
                raise serializers.ValidationError(
                    {"values": "You cannot change fields marked sensitive."}
                )
        return attrs

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")
        if request and not request.user.has_perm("profiling.view_sensitive_profile"):
            hidden = set(
                instance.form_definition.fields.filter(sensitive=True).values_list("key", flat=True)
            )
            data["values"] = {
                key: value for key, value in instance.values.items() if key not in hidden
            }
        return data

    def _snapshot(self, instance):
        return {
            "reference": instance.reference,
            "form_definition": str(instance.form_definition_id),
            "given_name": instance.given_name,
            "middle_name": instance.middle_name,
            "family_name": instance.family_name,
            "suffix": instance.suffix,
            "birth_date": instance.birth_date.isoformat() if instance.birth_date else None,
            "values": instance.values,
            "verification_status": instance.verification_status,
        }

    @transaction.atomic
    def create(self, validated_data):
        resident = Resident.objects.create(
            created_by=self.context["request"].user, **validated_data
        )
        ResidentRevision.objects.create(
            resident=resident,
            changed_by=self.context["request"].user,
            snapshot=self._snapshot(resident),
        )
        return resident

    @transaction.atomic
    def update(self, instance, validated_data):
        resident = super().update(instance, validated_data)
        ResidentRevision.objects.create(
            resident=resident,
            changed_by=self.context["request"].user,
            snapshot=self._snapshot(resident),
        )
        return resident
