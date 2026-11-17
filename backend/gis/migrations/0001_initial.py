# Initial PostGIS schema. Apply only after GeoDjango and PostGIS are verified.
import django.contrib.gis.db.models.fields
import django.core.validators
import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("households", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="HousingLocation",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("point", django.contrib.gis.db.models.fields.PointField(srid=4326)),
                ("source", models.CharField(max_length=200)),
                ("collection_method", models.CharField(max_length=150)),
                ("source_crs", models.CharField(max_length=80)),
                (
                    "accuracy_m",
                    models.DecimalField(
                        blank=True,
                        decimal_places=2,
                        max_digits=8,
                        null=True,
                        validators=[django.core.validators.MinValueValidator(0)],
                    ),
                ),
                (
                    "verification_status",
                    models.CharField(
                        choices=[
                            ("unverified", "Unverified"),
                            ("verified", "Verified"),
                            ("rejected", "Rejected"),
                        ],
                        default="unverified",
                        max_length=20,
                    ),
                ),
                ("verified_at", models.DateTimeField(blank=True, null=True)),
                (
                    "verified_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "housing_unit",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="location_revisions",
                        to="households.housingunit",
                    ),
                ),
                (
                    "superseded_by",
                    models.OneToOneField(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="supersedes",
                        to="gis.housinglocation",
                    ),
                ),
            ],
            options={"ordering": ("-created_at", "-id")},
        ),
        migrations.AddIndex(
            model_name="housinglocation",
            index=models.Index(
                fields=("housing_unit", "verification_status"), name="location_unit_status"
            ),
        ),
        migrations.AddIndex(
            model_name="housinglocation",
            index=models.Index(fields=("superseded_by",), name="location_current"),
        ),
    ]
