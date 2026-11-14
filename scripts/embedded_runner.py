"""Fallback for isolated local verification when a full Python install is unavailable."""
import runpy
import os
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
# Tell the Django launcher that packages were added to this process manually.
# The embeddable interpreter does not preserve these paths in reloader children.
os.environ['BIMS_EMBEDDED_RUNTIME'] = '1'
sys.path.insert(0, str(root / '.tools' / 'python-packages'))
sys.path.insert(0, str(root / 'scripts'))
arguments = sys.argv[1:]
if not arguments:
    raise SystemExit('Provide a Python script path to run.')
sys.argv[:] = arguments
runpy.run_path(arguments[0], run_name='__main__')
