from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User
from households.models import (
    Household,
    HouseholdMembership,
    HouseholdOccupancy,
    HousingUnit,
)
from profiling.models import FormDefinition, Resident


class OverviewTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_superuser(
            username="synthetic-overview-admin", password="LongSyntheticTestPassword123"
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_counts_database_records_without_inventing_family_or_program_totals(self):
        definition = FormDefinition.objects.create(
            module="residents", name="Synthetic profile", version=1, created_by=self.user
        )
        Resident.objects.create(
            form_definition=definition,
            given_name="Synthetic",
            family_name="Resident",
            residency_classification="RESIDENT",
            verification_status="VERIFIED",
            sex="Female",
            birth_date=timezone.localdate().replace(year=timezone.localdate().year - 20),
            created_by=self.user,
        )
        Resident.objects.create(
            form_definition=definition,
            given_name="Archived",
            family_name="Sample",
            is_archived=True,
            created_by=self.user,
        )
        household = Household.objects.create(
            label="Synthetic household",
            water_source="LEVEL_III",
            sanitation_type="FLUSH_SEPTIC",
            created_by=self.user,
        )
        unit = HousingUnit.objects.create(label="Synthetic unit", created_by=self.user)
        HouseholdOccupancy.objects.create(
            household=household,
            housing_unit=unit,
            valid_from=timezone.localdate(),
            created_by=self.user,
        )
        HouseholdMembership.objects.create(
            household=household,
            resident=Resident.objects.get(given_name="Synthetic"),
            valid_from=timezone.localdate(),
            created_by=self.user,
        )

        response = self.client.get("/api/v1/overview/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["registered_persons"], 1)
        self.assertEqual(response.data["verified_residents"], 1)
        self.assertEqual(response.data["active_households"], 1)
        self.assertEqual(response.data["housing_units"], 1)
        self.assertEqual(response.data["occupied_units"], 1)
        self.assertEqual(response.data["age_groups"]["Young Adults (18-24)"], 1)
        self.assertEqual(response.data["household_sizes"]["1"], 1)
        self.assertEqual(response.data["water_sources"]["Level III"], 1)
        self.assertEqual(
            response.data["sanitation"]["Flush-type toilet with septic tank"], 1
        )
        self.assertEqual(response.data["data_quality"]["Residents missing birthdate"], 0)
        self.assertEqual(
            response.data["data_quality"]["Housing units without current occupancy"], 0
        )
        self.assertNotIn("families", response.data)
        self.assertNotIn("four_ps", response.data)

    def test_non_registry_account_cannot_read_summary(self):
        user = User.objects.create_user(
            username="synthetic-no-registry", password="LongSyntheticTestPassword123"
        )
        self.client.force_authenticate(user=user)
        self.assertEqual(self.client.get("/api/v1/overview/").status_code, 403)
