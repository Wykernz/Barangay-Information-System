from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction


class Command(BaseCommand):
    help = "Explicitly assign an existing account to health administration or health-only access."

    def add_arguments(self, parser):
        parser.add_argument("username")
        parser.add_argument("role", choices=("admin", "worker", "remove"))

    @transaction.atomic
    def handle(self, *args, **options):
        user = get_user_model().objects.filter(username=options["username"]).first()
        if user is None:
            raise CommandError("Account does not exist; no changes made.")
        if options["role"] == "worker" and (user.is_superuser or user.is_staff):
            raise CommandError("Use a separate non-staff, non-superuser health-worker account.")
        roles = Group.objects.filter(name__in=("Health Workers", "Health Administrators"))
        user.groups.remove(*roles)
        if options["role"] != "remove":
            name = "Health Workers" if options["role"] == "worker" else "Health Administrators"
            group, _ = Group.objects.get_or_create(name=name)
            user.groups.add(group)
        self.stdout.write(self.style.SUCCESS("Health role updated."))
