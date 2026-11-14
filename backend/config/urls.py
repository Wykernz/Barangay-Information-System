from django.urls import path
from rest_framework.decorators import api_view
from rest_framework.response import Response
from drf_spectacular.views import SpectacularAPIView
from accounts.views import csrf, sign_in, sign_out


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
