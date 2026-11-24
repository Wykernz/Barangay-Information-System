import os
import sys
from pathlib import Path

if os.environ.get("BIMS_EMBEDDED_RUNTIME") == "1":
    backend_directory = Path(__file__).resolve().parent
    repository_root = Path(__file__).resolve().parent.parent
    fallback_packages = repository_root / ".tools" / "python-packages"
    sys.path[:0] = [str(backend_directory), str(fallback_packages)]

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

if __name__ == '__main__':
    from django.core.management import execute_from_command_line

    execute_from_command_line(sys.argv)
