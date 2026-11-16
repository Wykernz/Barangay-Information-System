from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from common.permissions import ChangeModelPermissions, StrictModelPermissions

from .models import HousingLocation
from .serializers import HousingLocationSerializer


class HousingLocationViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """Create corrections as revisions; never patch point provenance in place."""

    serializer_class = HousingLocationSerializer
    permission_classes = (StrictModelPermissions,)
    queryset = HousingLocation.objects.select_related("housing_unit")
    filterset_fields = ("housing_unit", "verification_status", "source", "collection_method")
    ordering_fields = ("created_at", "verification_status")
    ordering = ("-created_at",)

    @extend_schema(request=None, responses=HousingLocationSerializer)
    @action(detail=True, methods=("post",), permission_classes=(ChangeModelPermissions,))
    def verify(self, request, pk=None):
        location = self.get_object()
        if (
            location.superseded_by_id is not None
            or location.verification_status != HousingLocation.VerificationStatus.UNVERIFIED
        ):
            return Response(
                {"detail": "Only a current unverified location can be verified."},
                status=status.HTTP_409_CONFLICT,
            )
        location.verification_status = HousingLocation.VerificationStatus.VERIFIED
        location.verified_at = timezone.now()
        location.verified_by = request.user
        location.save(
            update_fields=("verification_status", "verified_at", "verified_by", "updated_at")
        )
        return Response(self.get_serializer(location).data)

    @action(detail=False, methods=("get",))
    def geojson(self, request):
        queryset = self.filter_queryset(self.get_queryset()).filter(superseded_by__isnull=True)
        total = queryset.count()
        features = [
            {
                "type": "Feature",
                "id": str(location.id),
                "geometry": {
                    "type": "Point",
                    "coordinates": [location.point.x, location.point.y],
                },
                "properties": {
                    "housing_unit": str(location.housing_unit_id),
                    "housing_reference": location.housing_unit.reference,
                    "verification_status": location.verification_status,
                    "accuracy_m": str(location.accuracy_m)
                    if location.accuracy_m is not None
                    else None,
                    "recorded_at": location.created_at.isoformat(),
                },
            }
            for location in queryset[:1000]
        ]
        return Response(
            {
                "type": "FeatureCollection",
                "features": features,
                "metadata": {"returned": len(features), "total": total, "truncated": total > 1000},
            }
        )
