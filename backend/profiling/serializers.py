from django.db import transaction
from django.utils import timezone
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .models import FormDefinition, FormField, Resident
from .photos import prepare_photo
from .resident_records import save_resident_profile
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


class ResidentClassificationField(serializers.ChoiceField):
    """Readable API vocabulary backed by the pre-existing stored codes."""

    def __init__(self, **kwargs):
        super().__init__(
            choices=("Resident", "Non-resident", "Not recorded"),
            required=False,
            allow_null=True,
            **kwargs,
        )

    def to_internal_value(self, data):
        value = super().to_internal_value(data)
        return {"Resident": "RESIDENT", "Non-resident": "NON_RESIDENT", "Not recorded": None}.get(
            value
        )

    def to_representation(self, value):
        return {"RESIDENT": "Resident", "NON_RESIDENT": "Non-resident", None: "Not recorded"}.get(
            value, value
        )


class ResidentDuplicateCheckSerializer(serializers.Serializer):
    given_name = serializers.CharField(max_length=150, trim_whitespace=True)
    family_name = serializers.CharField(max_length=150, trim_whitespace=True)
    birth_date = serializers.DateField(required=False, allow_null=True)

    def validate_given_name(self, value):
        if not value:
            raise serializers.ValidationError("Enter a first name.")
        return value

    def validate_family_name(self, value):
        if not value:
            raise serializers.ValidationError("Enter a surname.")
        return value


class ResidentDuplicateCandidateSerializer(serializers.Serializer):
    resident_id = serializers.UUIDField()
    reference = serializers.CharField()
    display_name = serializers.CharField()
    reasons = serializers.ListField(child=serializers.CharField())


class ResidentDuplicateCheckResponseSerializer(serializers.Serializer):
    candidates = ResidentDuplicateCandidateSerializer(many=True)
    truncated = serializers.BooleanField()


class ResidentSerializer(serializers.ModelSerializer):
    age = serializers.SerializerMethodField()
    photo = serializers.FileField(write_only=True, required=False)
    photo_url = serializers.SerializerMethodField()
    residency_classification = ResidentClassificationField()
    verification_status = serializers.SerializerMethodField()

    @extend_schema_field(serializers.CharField())
    def get_verification_status(self, obj):
        return obj.verification_status.lower()

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
            "sex",
            "civil_status",
            "nationality",
            "place_of_birth",
            "contact_number",
            "email",
            "residency_classification",
            "residency_status",
            "record_status",
            "purok",
            "is_archived",
            "photo",
            "photo_url",
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
        extra_kwargs = {"form_definition": {"required": False}}

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_photo_url(self, obj):
        if not obj.photo:
            return None
        from urllib.parse import urlencode

        return f"/api/v1/residents/{obj.pk}/photo/?" + urlencode({"v": obj.updated_at.isoformat()})

    def validate_photo(self, value):
        return prepare_photo(value)

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
        if definition is None and values:
            raise serializers.ValidationError(
                {"values": "Select an active custom form for extension values."}
            )
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

    def create(self, validated_data):
        return save_resident_profile(
            actor=self.context["request"].user, validated_data=validated_data
        )

    def update(self, instance, validated_data):
        return save_resident_profile(
            actor=self.context["request"].user, validated_data=validated_data, instance=instance
        )
