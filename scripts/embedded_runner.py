"""Fallback for isolated local verification when a full Python install is unavailable."""
import runpy
import os
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
# Tell Django that this process uses the repository's isolated fallback runtime.
os.environ['BIMS_EMBEDDED_RUNTIME'] = '1'
runtime_paths = [
    root / '.tools' / 'python-packages',
    root / 'scripts',
    root / 'backend',
]
# Django's autoreloader starts manage.py in a child process. Export the fallback
# paths as PYTHONPATH so the child can import the same dependencies and settings.
existing_paths = os.environ.get('PYTHONPATH', '')
os.environ['PYTHONPATH'] = os.pathsep.join(
    [*(str(path) for path in runtime_paths), *([existing_paths] if existing_paths else [])]
)
for path in reversed(runtime_paths):
    sys.path.insert(0, str(path))
arguments = sys.argv[1:]
if not arguments:
    raise SystemExit('Provide a Python script path, -m module, or -c command to run.')
if arguments[0] in ('-m', '-c'):
    if len(arguments) < 2:
        raise SystemExit(f'{arguments[0]} requires an argument.')
    if arguments[0] == '-m':
        sys.argv[:] = arguments[1:]
        runpy.run_module(arguments[1], run_name='__main__', alter_sys=True)
    else:
        sys.argv[:] = ['-c', *arguments[2:]]
        exec(compile(arguments[1], '<string>', 'exec'), {'__name__': '__main__'})
else:
    sys.argv[:] = arguments
    runpy.run_path(arguments[0], run_name='__main__')
