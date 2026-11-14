"""Create an isolated localhost-only PostgreSQL cluster for synthetic development."""
import os
import secrets
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LOCAL = ROOT / '.local'
DATA = LOCAL / 'postgres'
BIN = Path(os.environ.get('POSTGRES_BIN', r'C:\Program Files\PostgreSQL\18\bin'))
ENV_FILE = ROOT / 'backend' / '.env'
PORT = '55432'


def run(name: str, *args: str, env=None) -> None:
    subprocess.run([str(BIN / f'{name}.exe'), *args], check=True, env=env)


if __name__ == '__main__':
    if not (BIN / 'initdb.exe').exists():
        raise SystemExit('Set POSTGRES_BIN to the PostgreSQL bin directory first.')
    if DATA.exists() or ENV_FILE.exists():
        raise SystemExit('Local configuration already exists; refusing to overwrite it. See LOCAL_DEVELOPMENT.md.')
    LOCAL.mkdir(exist_ok=True)
    password = secrets.token_urlsafe(32)
    password_file = LOCAL / 'initial-password'
    try:
        password_file.write_text(password, encoding='utf-8')
        run('initdb', '-D', str(DATA), '-U', 'bims_dev', '--auth=scram-sha-256',
            '--encoding=UTF8', '--locale=C', '--pwfile', str(password_file))
    except subprocess.CalledProcessError:
        raise SystemExit(
            'PostgreSQL initialization failed. If Application Control blocked a DLL, '
            'ask IT to repair/approve PostgreSQL; do not disable security controls. '
            'No backend/.env was created. Review the PostgreSQL error above.'
        ) from None
    finally:
        password_file.unlink(missing_ok=True)
    run('pg_ctl', '-D', str(DATA), '-l', str(LOCAL / 'postgres.log'),
        '-o', f'-h 127.0.0.1 -p {PORT}', '-w', 'start')
    connection_env = {**os.environ, 'PGPASSWORD': password}
    run('createdb', '-h', '127.0.0.1', '-p', PORT, '-U', 'bims_dev', 'bims_dev',
        env=connection_env)
    ENV_FILE.write_text(
        f'DJANGO_SECRET_KEY={secrets.token_urlsafe(64)}\nDJANGO_DEBUG=true\n'
        'DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1\n'
        f'POSTGRES_DB=bims_dev\nPOSTGRES_USER=bims_dev\nPOSTGRES_PASSWORD={password}\n'
        f'POSTGRES_HOST=127.0.0.1\nPOSTGRES_PORT={PORT}\n', encoding='utf-8',
    )
    print('Local development database and backend/.env created. Credentials were not printed.')
    print('Use this cluster only for synthetic local development, never resident records.')
