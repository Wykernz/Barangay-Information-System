from django.urls import path
from drf_spectacular.utils import extend_schema
from drf_spectacular.views import SpectacularAPIView
from rest_framework import serializers
from rest_framework.decorators import api_view
from rest_framework.response import Response

from accounts.views import csrf, sign_in, sign_out


class SessionSerializer(serializers.Serializer):
    """Public shape of the authenticated staff session response."""

    username = serializers.CharField(read_only=True)


@extend_schema(responses=SessionSerializer)
@api_view(['GET'])
def session(request):
    return Response({'username': request.user.username})


urlpatterns = [
    path('api/v1/auth/csrf/', csrf),
    path('api/v1/auth/login/', sign_in),
    path('api/v1/auth/logout/', sign_out),
    path('api/v1/session/', session),
    path('api/v1/schema/', SpectacularAPIView.as_view()),
]
