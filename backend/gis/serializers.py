from django.contrib.gis.geos import Point
from rest_framework import serializers

from .models import HousingLocation
from .services import record_housing_location


class HousingLocationSerializer(serializers.ModelSerializer):
    coordinates = serializers.ListField(
        child=serializers.FloatField(), min_length=2, max_length=2, write_only=True
    )
    geometry = serializers.SerializerMethodField()

    class Meta:
        model = HousingLocation
        fields = (
            "id",
            "housing_unit",
            "geometry",
            "coordinates",
            "source",
            "collection_method",
            "source_crs",
            "accuracy_m",
            "verification_status",
            "verified_at",
            "verified_by",
            "superseded_by",
            "created_at",
        )
        read_only_fields = (
            "id",
            "geometry",
            "verification_status",
            "verified_at",
            "verified_by",
            "superseded_by",
            "created_at",
        )

    def get_geometry(self, obj):
        return {"type": "Point", "coordinates": [obj.point.x, obj.point.y]}

    def validate_coordinates(self, value):
        longitude, latitude = value
        if not -180 <= longitude <= 180 or not -90 <= latitude <= 90:
            raise serializers.ValidationError("Coordinates must be valid longitude and latitude.")
        return value

    def validate_source_crs(self, value):
        if value.upper() not in ("EPSG:4326", "4326", "WGS84"):
            raise serializers.ValidationError(
                "The initial API accepts normalized EPSG:4326 coordinates only; "
                "transform other source CRS values in the reviewed GIS staging workflow."
            )
        return value

    def create(self, validated_data):
        longitude, latitude = validated_data.pop("coordinates")
        return record_housing_location(
            created_by=self.context["request"].user,
            point=Point(longitude, latitude, srid=4326),
            **validated_data,
        )
