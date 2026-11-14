"""Run backend tests with the same local configuration as the server."""
import os
import sys
from pathlib import Path

from dev import load_environment

if __name__ == '__main__':
    root = Path(__file__).resolve().parent.parent
    load_environment(root / 'backend' / '.env')
    sys.path.insert(0, str(root / 'backend'))
    os.chdir(root / 'backend')
    import pytest

    raise SystemExit(pytest.main(sys.argv[1:]))
