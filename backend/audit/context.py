from contextvars import ContextVar

current_actor = ContextVar("current_audit_actor", default=None)
current_correlation_id = ContextVar("current_audit_correlation_id", default=None)
