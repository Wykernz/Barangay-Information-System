"""Private profile images: bounded decoding, canonical JPEG, no source metadata."""

import warnings
from io import BytesIO
from uuid import uuid4

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import FileSystemStorage
from django.core.files.uploadedfile import UploadedFile
from PIL import Image, ImageOps, UnidentifiedImageError
from rest_framework.exceptions import ValidationError

MAX_PHOTO_BYTES = 5 * 1024 * 1024


class ResidentPhotoStorage(FileSystemStorage):
    @property
    def base_location(self) -> str:
        return str(settings.PRIVATE_MEDIA_ROOT)

    @property
    def location(self) -> str:
        return str(settings.PRIVATE_MEDIA_ROOT)


def resident_photo_storage() -> FileSystemStorage:
    return ResidentPhotoStorage()


def resident_photo_path(instance: object, filename: str) -> str:
    return f"resident-photos/{uuid4().hex}.jpg"


def prepare_photo(upload: UploadedFile) -> ContentFile:
    if upload.size > MAX_PHOTO_BYTES:
        raise ValidationError("Photo must be at most 5 MiB.")
    raw = upload.read(MAX_PHOTO_BYTES + 1)
    if len(raw) > MAX_PHOTO_BYTES:
        raise ValidationError("Photo must be at most 5 MiB.")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(raw)) as source:
                if (
                    source.format not in ("JPEG", "PNG")
                    or source.width * source.height > 10_000_000
                ):
                    raise ValidationError("Use a JPEG/PNG photo with at most 10 million pixels.")
                if getattr(source, "n_frames", 1) != 1:
                    raise ValidationError("Animated photos are not supported.")
                image = ImageOps.exif_transpose(source).convert("RGB")
                image.thumbnail((1024, 1024))
                output = BytesIO()
                image.save(output, format="JPEG", quality=88)
                return ContentFile(output.getvalue(), name="validated.jpg")
    except (
        UnidentifiedImageError,
        OSError,
        ValueError,
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
    ):
        raise ValidationError("Upload a valid JPEG or PNG photo.") from None
