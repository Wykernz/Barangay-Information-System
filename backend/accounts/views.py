import json

from django.contrib.auth import authenticate, login, logout
from django.core.cache import cache
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_GET, require_POST


@require_GET
def csrf(request):
    return JsonResponse({"csrfToken": get_token(request)})


@require_POST
@csrf_protect
def sign_in(request):
    try:
        payload = json.loads(request.body)
    except (ValueError, UnicodeDecodeError):
        return JsonResponse({"detail": "Invalid request."}, status=400)
    if not isinstance(payload, dict):
        return JsonResponse({"detail": "Invalid request."}, status=400)
    username, password = payload.get("username"), payload.get("password")
    if not isinstance(username, str) or not isinstance(password, str):
        return JsonResponse({"detail": "Invalid credentials."}, status=400)
    if len(username) > 150 or len(password) > 1024:
        return JsonResponse({"detail": "Invalid credentials."}, status=400)
    # Shared cache is required before deploying multiple application workers.
    key = "login:" + request.META.get("REMOTE_ADDR", "unknown")
    cache.add(key, 0, timeout=300)
    try:
        attempts = cache.incr(key)
    except ValueError:
        cache.set(key, 1, timeout=300)
        attempts = 1
    if attempts > 10:
        return JsonResponse({"detail": "Try again later."}, status=429)
    user = authenticate(request, username=username, password=password)
    if user is None:
        return JsonResponse({"detail": "Invalid credentials."}, status=401)
    login(request, user)
    return JsonResponse({"username": user.username})


@require_POST
@csrf_protect
def sign_out(request):
    logout(request)
    return JsonResponse({"detail": "Signed out."})
