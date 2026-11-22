import uuid

from .context import current_actor, current_correlation_id
from .models import AuditEvent


def record_event(*, action: str, target, actor=None, metadata=None) -> AuditEvent:
    """Record IDs and actions only; metadata callers must never include resident payloads."""
    actor = actor or current_actor.get()
    if actor is not None and not actor.is_authenticated:
        actor = None
    target_id = target.pk
    if not isinstance(target_id, uuid.UUID):
        try:
            target_id = uuid.UUID(str(target_id))
        except ValueError:
            # Auth user primary keys are integers; encode them losslessly into the
            # UUID audit target column while target_type preserves their namespace.
            target_id = uuid.UUID(int=int(target_id))
    return AuditEvent.objects.create(
        actor=actor,
        action=action,
        target_type=target._meta.label_lower,
        target_id=target_id,
        correlation_id=current_correlation_id.get(),
        metadata=metadata or {},
    )
