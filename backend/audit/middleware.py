from uuid import uuid4

from .context import current_actor, current_correlation_id


class AuditContextMiddleware:
    """Attach request accountability without putting resident values in audit events."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        actor_token = current_actor.set(request.user if request.user.is_authenticated else None)
        correlation_token = current_correlation_id.set(uuid4())
        try:
            return self.get_response(request)
        finally:
            current_actor.reset(actor_token)
            current_correlation_id.reset(correlation_token)
