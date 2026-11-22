import uuid

from django.contrib.auth.models import Group
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User
from accounts.roles import assign_staff_role

from .models import AuditEvent


class AuditEventApiTests(TestCase):
    def setUp(self):
        self.staff = User.objects.create_user(
            username="synthetic-barangay-admin", password="SyntheticPassword123!"
        )
        self.admin = User.objects.create_superuser(
            username="synthetic-system-admin", password="SyntheticPassword123!"
        )
        assign_staff_role(user=self.staff, role="barangay_admin", actor=self.admin)
        self.client = APIClient()
        self.client.force_login(self.staff)

    def test_barangay_admin_can_filter_audit_events_without_receiving_metadata(self):
        event = AuditEvent.objects.create(
            actor=self.staff,
            action="households.household.create",
            target_type="households.household",
            target_id=uuid.uuid4(),
            metadata={"sensitive": "must not be returned"},
        )
        response = self.client.get(
            "/api/v1/audit/events/",
            {"action": "households.household.create", "staff": self.staff.username},
        )
        self.assertEqual(response.status_code, 200)
        result = response.data["results"][0]
        self.assertEqual(result["id"], str(event.id))
        self.assertEqual(result["actor_username"], self.staff.username)
        self.assertNotIn("metadata", result)

    def test_barangay_role_gets_view_only_audit_permission(self):
        self.assertTrue(self.staff.has_perm("audit.view_auditevent"))
        self.assertFalse(self.staff.has_perm("audit.add_auditevent"))

    def test_healthcare_account_is_blocked_from_audit_endpoint(self):
        health_user = User.objects.create_user(
            username="synthetic-health-admin", password="SyntheticPassword123!"
        )
        health_group, _ = Group.objects.get_or_create(name="Healthcare Administrators")
        health_user.groups.add(health_group)
        client = APIClient()
        client.force_login(health_user)
        self.assertEqual(client.get("/api/v1/audit/events/").status_code, 403)
