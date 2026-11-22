"""Explicit staff-role bundles; Health is never inferred from generic administration."""

from typing import Literal

from django.contrib.auth.models import Group, Permission
from django.core.exceptions import ValidationError
from django.db import transaction

from audit.services import record_event

from .models import User

StaffRole = Literal["healthcare_admin", "barangay_admin"]
MANAGED_GROUPS = (
    "Healthcare Administrators",
    "Health Workers",
    "Health Administrators",
    "Barangay Administrators",
)


@transaction.atomic
def assign_staff_role(*, user: User, role: StaffRole, actor: User | None = None) -> User:
    """Replace only managed role groups, retaining unrelated permissions/history."""
    user = User.objects.select_for_update().get(pk=user.pk)
    if role not in ("healthcare_admin", "barangay_admin"):
        raise ValidationError("Choose healthcare_admin or barangay_admin.")
    if role == "healthcare_admin" and (user.is_superuser or user.is_staff):
        raise ValidationError("Use a separate non-superuser, non-Django-admin healthcare account.")
    user.groups.remove(*Group.objects.filter(name__in=MANAGED_GROUPS))
    if role == "healthcare_admin":
        group, _ = Group.objects.get_or_create(name="Healthcare Administrators")
        user.groups.add(group)
    else:
        group, _ = Group.objects.get_or_create(name="Barangay Administrators")
        permissions = list(
            Permission.objects.filter(
                content_type__app_label__in=("profiling", "households", "gis")
            )
        ) + list(
            Permission.objects.filter(
                content_type__app_label="audit", codename="view_auditevent"
            )
        )
        group.permissions.set(
            [
                permission
                for permission in permissions
                if permission.codename.startswith(("view_", "add_", "change_"))
                and "sensitive" not in permission.codename
            ]
        )
        health, _ = Group.objects.get_or_create(name="Health Administrators")
        user.groups.add(group, health)
    for name in ("_perm_cache", "_user_perm_cache", "_group_perm_cache"):
        user.__dict__.pop(name, None)
    record_event(
        action="accounts.staff_role.assign", target=user, actor=actor, metadata={"role": role}
    )
    return user
