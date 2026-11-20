from .context import current_actor, current_correlation_id
from .models import AuditEvent


def record_event(*, action: str, target, actor=None, metadata=None) -> AuditEvent:
    """Record IDs and actions only; metadata callers must never include resident payloads."""
    actor = actor or current_actor.get()
    if actor is not None and not actor.is_authenticated:
        actor = None
    return AuditEvent.objects.create(
        actor=actor,
        action=action,
        target_type=target._meta.label_lower,
        target_id=target.pk,
        correlation_id=current_correlation_id.get(),
        metadata=metadata or {},
    )
