"""Explicit health access and healthcare-only server isolation."""

from django.http import JsonResponse
from rest_framework.permissions import BasePermission

HEALTH_ONLY_GROUPS = ("Healthcare Administrators", "Health Workers")
HEALTH_ACCESS_GROUPS = ("Health Administrators", "Health Workers", "Healthcare Administrators")


class HealthAccessPermission(BasePermission):
    """Health access is explicitly assigned, including for administrators."""

    def has_permission(self, request, view):
        return bool(
            request.user.is_authenticated
            and request.user.groups.filter(
                name__in=HEALTH_ACCESS_GROUPS,
            ).exists()
        )


def health_only(user) -> bool:
    return bool(user.is_authenticated and user.groups.filter(name__in=HEALTH_ONLY_GROUPS).exists())


class HealthWorkerIsolationMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        allowed = {
            "/api/v1/session/",
            "/api/v1/auth/csrf/",
            "/api/v1/auth/login/",
            "/api/v1/auth/logout/",
        }
        if (
            health_only(request.user)
            and request.path not in allowed
            and not request.path.startswith("/api/v1/health/")
        ):
            return JsonResponse(
                {"detail": "This account is restricted to the health section."},
                status=403,
            )
        return self.get_response(request)
