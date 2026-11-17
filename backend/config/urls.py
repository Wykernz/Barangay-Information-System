from django.conf import settings
from django.urls import include, path
from drf_spectacular.utils import extend_schema
from drf_spectacular.views import SpectacularAPIView
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.routers import DefaultRouter

from accounts.serializers import StaffSessionSerializer
from accounts.views import csrf, sign_in, sign_out
from households.views import (
    HouseholdMembershipViewSet,
    HouseholdOccupancyViewSet,
    HouseholdViewSet,
    HousingUnitViewSet,
)
from profiling.views import FormDefinitionViewSet, ResidentViewSet


@extend_schema(responses=StaffSessionSerializer)
@api_view(["GET"])
def session(request):
    return Response({"username": request.user.username})


router = DefaultRouter()
router.register("profile-forms", FormDefinitionViewSet, basename="profile-form")
router.register("residents", ResidentViewSet, basename="resident")
router.register("households", HouseholdViewSet, basename="household")
router.register("housing-units", HousingUnitViewSet, basename="housing-unit")
router.register("household-memberships", HouseholdMembershipViewSet, basename="membership")
router.register("household-occupancies", HouseholdOccupancyViewSet, basename="occupancy")
if settings.GIS_ENABLED:
    from gis.views import HousingLocationViewSet

    router.register("housing-locations", HousingLocationViewSet, basename="housing-location")

urlpatterns = [
    path("api/v1/auth/csrf/", csrf),
    path("api/v1/auth/login/", sign_in),
    path("api/v1/auth/logout/", sign_out),
    path("api/v1/session/", session),
    path("api/v1/schema/", SpectacularAPIView.as_view()),
    path("api/v1/", include(router.urls)),
]
