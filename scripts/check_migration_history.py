"""Report applied migrations absent from this checkout without changing the database."""

import os
import sys
from pathlib import Path

from dev import load_environment


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    load_environment(root / "backend" / ".env")
    sys.path.insert(0, str(root / "backend"))
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    import django

    django.setup()
    from django.db import connection
    from django.db.migrations.loader import MigrationLoader
    from django.db.migrations.recorder import MigrationRecorder

    loader = MigrationLoader(connection)
    applied = set(MigrationRecorder(connection).applied_migrations())
    known = set(loader.disk_migrations)
    replaced = {
        migration
        for replacement in loader.disk_migrations.values()
        for migration in (replacement.replaces or [])
    }
    missing = sorted(applied - known - replaced)
    if missing:
        print("Applied migrations missing from this checkout:")
        for app, name in missing:
            print(f"  {app}/{name}")
        raise SystemExit(
            "Migration history differs from source. Reconcile before schema changes; "
            "do not delete records or fake migrations to hide the mismatch."
        )
    loader.check_consistent_history(connection)
    pending = sorted(set(loader.graph.leaf_nodes()) - applied)
    if pending:
        print("Pending migration leaf nodes:")
        for app, name in pending:
            print(f"  {app}/{name}")
    print("PASS: applied migration history matches available migration files.")


if __name__ == "__main__":
    main()
