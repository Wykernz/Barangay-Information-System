from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .access import HealthAccessPermission, health_only


class HealthWorkspaceSerializer(serializers.Serializer):
    health_only = serializers.BooleanField(read_only=True)
    capture_available = serializers.BooleanField(read_only=True)


@extend_schema(responses=HealthWorkspaceSerializer)
@api_view(["GET"])
@permission_classes([HealthAccessPermission])
def health_workspace(request):
    return Response({"health_only": health_only(request.user), "capture_available": False})
