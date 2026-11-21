from datetime import timedelta
from importlib import import_module
from io import BytesIO
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from PIL import Image
from rest_framework.exceptions import ValidationError

from .photos import MAX_PHOTO_BYTES, prepare_photo
from .serializers import ResidentSerializer


def photo_upload(format="PNG"):
    data = BytesIO()
    image = Image.new("RGB", (24, 20), "blue")
    exif = Image.Exif()
    exif[270] = "Synthetic private metadata"
    image.save(data, format=format, exif=exif)
    return SimpleUploadedFile("untrusted-name.png", data.getvalue())


@pytest.mark.parametrize("format", ["JPEG", "PNG"])
def test_photo_is_canonical_jpeg_without_original_metadata(format):
    result = prepare_photo(photo_upload(format))
    with Image.open(result) as image:
        assert image.format == "JPEG"
        assert image.size == (24, 20)
        assert not image.getexif()


@pytest.mark.parametrize("data", [b"not an image", b"<svg><script/></svg>", b"GIF89a"])
def test_photo_rejects_invalid_and_unsupported_content(data):
    with pytest.raises(ValidationError):
        prepare_photo(SimpleUploadedFile("fake.jpg", data))


def test_photo_rejects_size_limit_before_decode():
    with pytest.raises(ValidationError, match="5 MiB"):
        prepare_photo(SimpleNamespace(size=MAX_PHOTO_BYTES + 1))


def test_generated_fields_are_read_only_and_age_has_no_storage():
    serializer = ResidentSerializer()
    for name in ("id", "reference", "age", "created_at", "verification_status", "photo_url"):
        assert serializer.fields[name].read_only
    assert not serializer.fields["form_definition"].required
    assert "age" not in {field.name for field in serializer.Meta.model._meta.fields}


@pytest.mark.parametrize(
    "field,value",
    [
        ("email", "invalid"),
        ("record_status", "invented"),
        ("residency_status", "invented"),
        ("sex", "invented"),
        ("birth_date", (timezone.localdate() + timedelta(days=1)).isoformat()),
    ],
)
def test_api_rejects_invalid_profile_values(field, value):
    serializer = ResidentSerializer(
        data={"given_name": "Synthetic", "family_name": "Test", field: value}
    )
    assert not serializer.is_valid()
    assert field in serializer.errors


def test_custom_values_require_an_explicit_contract():
    serializer = ResidentSerializer(
        data={"given_name": "Synthetic", "family_name": "Test", "values": {"unapproved": "value"}}
    )
    assert not serializer.is_valid()
    assert "values" in serializer.errors


@pytest.mark.parametrize(
    "metadata,accepted",
    [
        (("character varying", 20, "YES", None), True),
        (("character varying", 10, "YES", None), False),
        (("character varying", 20, "NO", None), False),
    ],
)
def test_legacy_column_adoption_requires_exact_metadata(metadata, accepted):
    module = import_module("profiling.migrations.0002_resident_profile_fields")
    operation = next(
        item for item in module.Migration.operations if item.name == "residency_classification"
    )
    editor = MagicMock()
    editor.connection.vendor = "postgresql"
    editor.connection.introspection.get_table_description.return_value = [
        SimpleNamespace(name="residency_classification")
    ]
    editor.connection.cursor.return_value.__enter__.return_value.fetchone.return_value = metadata
    state = MagicMock()
    state.apps.get_model.return_value._meta.db_table = "profiling_resident"
    state.apps.get_model.return_value._meta.get_field.return_value.column = (
        "residency_classification"
    )
    with patch("django.db.migrations.AddField.database_forwards") as add:
        if accepted:
            operation.database_forwards("profiling", editor, state, state)
        else:
            with pytest.raises(RuntimeError, match="Incompatible legacy"):
                operation.database_forwards("profiling", editor, state, state)
        add.assert_not_called()


def test_fresh_schema_adds_legacy_columns_normally():
    module = import_module("profiling.migrations.0002_resident_profile_fields")
    operation = module.Migration.operations[0]
    editor = MagicMock()
    editor.connection.introspection.get_table_description.return_value = []
    state = MagicMock()
    with patch("django.db.migrations.AddField.database_forwards") as add:
        operation.database_forwards("profiling", editor, state, state)
        add.assert_called_once()


def test_readable_classification_uses_existing_database_codes():
    from .serializers import ResidentClassificationField

    field = ResidentClassificationField()
    assert field.run_validation("Resident") == "RESIDENT"
    assert field.run_validation("Non-resident") == "NON_RESIDENT"
    assert field.run_validation("Not recorded") is None
    assert field.to_representation("NON_RESIDENT") == "Non-resident"
