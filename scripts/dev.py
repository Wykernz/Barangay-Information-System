"""Run Django with a gitignored local environment file, without shell activation."""
import os
import runpy
import sys
from pathlib import Path


def load_environment(path: Path) -> None:
    if not path.exists():
        required = ('DJANGO_SECRET_KEY', 'POSTGRES_DB', 'POSTGRES_USER', 'POSTGRES_PASSWORD')
        if all(os.environ.get(key) for key in required):
            return
        # The example contains placeholders, not working database credentials.
        # Setup must provision the database before the server can authenticate staff.
        raise SystemExit(
            f"Missing local configuration: {path}\n"
            "From the repository root, run:\n"
            "  .\\scripts\\python.cmd scripts/setup_existing.py\n"
            "Use your existing PostgreSQL administrator account at the hidden local prompt.\n"
            "Only after setup succeeds, run migrate, createsuperuser, then runserver.\n"
            "If PostgreSQL reports Application Control blocking plpgsql.dll, stop "
            "and have IT repair/approve PostgreSQL. Copying .env.example alone "
            "will not fix that block. See docs/RUNNING.md."
        )
    for number, raw in enumerate(path.read_text(encoding="utf-8-sig").splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        key, separator, value = line.partition("=")
        if not separator or not key.strip().isidentifier():
            raise SystemExit(f"Invalid environment entry at line {number}.")
        os.environ.setdefault(key.strip(), value.strip())


if __name__ == "__main__":
    root = Path(__file__).resolve().parent.parent
    load_environment(root / "backend" / ".env")
    sys.path.insert(0, str(root / "backend"))
    os.chdir(root / "backend")
    # Django's autoreloader starts a fresh interpreter with manage.py directly.
    # That child cannot see the fallback's injected package directory. Run one
    # process for this runtime; normal virtual environments retain auto-reload.
    if (
        os.environ.get('BIMS_EMBEDDED_RUNTIME') == '1'
        and len(sys.argv) > 1
        and sys.argv[1] == 'runserver'
        and '--noreload' not in sys.argv
    ):
        sys.argv.append('--noreload')
        print('Fallback Python: auto-reload disabled. Restart the server after backend edits.', flush=True)
    runpy.run_path(str(root / "backend" / "manage.py"), run_name="__main__")
