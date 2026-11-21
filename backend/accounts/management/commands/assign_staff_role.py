from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError

from accounts.roles import assign_staff_role


class Command(BaseCommand):
    help = (
        "Explicitly assign an existing account to healthcare-only or barangay-plus-health access."
    )

    def add_arguments(self, parser):
        parser.add_argument("username")
        parser.add_argument("role", choices=("healthcare_admin", "barangay_admin"))

    def handle(self, *args, **options):
        user = get_user_model().objects.filter(username=options["username"]).first()
        if not user:
            raise CommandError("Account not found; no changes made.")
        try:
            assign_staff_role(user=user, role=options["role"])
        except ValidationError as error:
            raise CommandError(" ".join(error.messages)) from error
        self.stdout.write(self.style.SUCCESS("Staff role assigned."))
