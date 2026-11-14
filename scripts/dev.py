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
        raise SystemExit(f"Missing {path}. Copy backend/.env.example to backend/.env first.")
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
    runpy.run_path(str(root / "backend" / "manage.py"), run_name="__main__")
