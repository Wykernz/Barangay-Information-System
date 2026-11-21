"""Create named staff accounts using local hidden password entry."""

import sys
from getpass import getpass

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.db import IntegrityError, transaction

from accounts.roles import assign_staff_role


class Command(BaseCommand):
    help = "Create a healthcare-only or barangay administrator with a hidden password prompt."

    def add_arguments(self, parser):
        parser.add_argument("username")
        parser.add_argument("role", choices=("healthcare_admin", "barangay_admin"))
        parser.add_argument(
            "--display-name", default="", help="Staff display label (up to 150 characters)."
        )

    def handle(self, *args, **options):
        if not sys.stdin.isatty():
            raise CommandError(
                "Run this command in an interactive terminal for hidden password entry."
            )
        username = options["username"].strip()
        User = get_user_model()
        display_name = options.get("display_name", "").strip()
        candidate = User(username=username, first_name=display_name)
        try:
            candidate.full_clean(exclude=("password",))
        except ValidationError as error:
            raise CommandError("Choose a valid unused username.") from error
        if User.objects.filter(username=username).exists():
            raise CommandError("Account already exists; no existing account was changed.")
        try:
            password = getpass("New password (hidden): ")
            confirmation = getpass("Confirm password (hidden): ")
        except (EOFError, KeyboardInterrupt) as error:
            raise CommandError("Account creation cancelled; no changes made.") from error
        if password != confirmation:
            raise CommandError("Passwords do not match; no changes made.")
        try:
            validate_password(password, user=candidate)
        except ValidationError as error:
            raise CommandError(" ".join(error.messages)) from error
        try:
            with transaction.atomic():
                user = User.objects.create_user(
                    username=username, password=password, first_name=display_name
                )
                assign_staff_role(user=user, role=options["role"])
        except IntegrityError:
            raise CommandError("Account creation could not complete; no changes made.") from None
        self.stdout.write(
            self.style.SUCCESS("Staff account created with the requested access role.")
        )
