"""Provision synthetic BIMS development data on an existing local PostgreSQL server.

Run this interactively: administrator credentials are never stored or printed.
Existing databases, roles, and configuration files are never overwritten.
"""
import getpass
import re
import secrets
import sys
from pathlib import Path

import psycopg
from psycopg import sql

ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = ROOT / 'backend' / '.env'


def validate_name(value: str) -> str:
    """Restrict generated configuration to simple PostgreSQL identifiers."""
    if not re.fullmatch(r'[a-z][a-z0-9_]{0,62}', value):
        raise ValueError('Use 1–63 lowercase letters, digits, or underscores; start with a letter.')
    return value


def provision(connection, name: str, port: int, env_file: Path) -> None:
    """Create one dedicated role/database and preserve credentials on partial failure."""
    validate_name(name)
    pending = env_file.with_name('.env.pending')
    if env_file.exists() or pending.exists():
        raise ValueError('Local .env or .env.pending already exists; refusing to overwrite it.')

    # Refuse collisions before writing configuration or changing the server.
    if connection.execute('SELECT 1 FROM pg_roles WHERE rolname = %s', (name,)).fetchone():
        raise ValueError('That role already exists. Choose a new BIMS development name.')
    if connection.execute('SELECT 1 FROM pg_database WHERE datname = %s', (name,)).fetchone():
        raise ValueError('That database already exists. Choose a new BIMS development name.')

    password = secrets.token_urlsafe(32)
    # Save only the generated application credentials, never the administrator's.
    # A pending file allows manual recovery if CREATE DATABASE fails after CREATE ROLE.
    with pending.open('x', encoding='utf-8') as output:
        output.write(
            f'DJANGO_SECRET_KEY={secrets.token_urlsafe(64)}\n'
            'DJANGO_DEBUG=true\nDJANGO_ALLOWED_HOSTS=localhost,127.0.0.1\n'
            f'POSTGRES_DB={name}\nPOSTGRES_USER={name}\nPOSTGRES_PASSWORD={password}\n'
            f'POSTGRES_HOST=127.0.0.1\nPOSTGRES_PORT={port}\n'
        )

    # The app role owns only its development database and has no admin privileges.
    # SQL identifiers/literals are quoted by psycopg, not concatenated into SQL.
    connection.execute(sql.SQL(
        'CREATE ROLE {} LOGIN PASSWORD {} NOSUPERUSER NOCREATEDB NOCREATEROLE'
    ).format(sql.Identifier(name), sql.Literal(password)))
    connection.execute(sql.SQL('CREATE DATABASE {} OWNER {}').format(
        sql.Identifier(name), sql.Identifier(name),
    ))
    pending.rename(env_file)


def main() -> None:
    if not sys.stdin.isatty():
        raise SystemExit('Run this command in your own interactive PowerShell terminal.')
    if ENV_FILE.exists() or ENV_FILE.with_name('.env.pending').exists():
        raise SystemExit('Configuration already exists. See docs/RUNNING.md; nothing was changed.')
    print('Configure BIMS on your existing local PostgreSQL server (synthetic development only).')
    try:
        port = int(input('PostgreSQL port [5432]: ').strip() or '5432')
        if not 1 <= port <= 65535:
            raise ValueError('Port must be between 1 and 65535.')
        administrator = input('PostgreSQL administrator username [postgres]: ').strip() or 'postgres'
        name = validate_name(input('New BIMS database and role name [bims_dev]: ').strip() or 'bims_dev')
        password = getpass.getpass('PostgreSQL administrator password (hidden): ')
        # CREATE DATABASE requires autocommit; it cannot run inside a transaction.
        with psycopg.connect(host='127.0.0.1', port=port, dbname='postgres',
                             user=administrator, password=password,
                             connect_timeout=5, autocommit=True) as connection:
            provision(connection, name, port, ENV_FILE)
        del password
    except (ValueError, EOFError) as error:
        raise SystemExit(str(error)) from None
    except (psycopg.Error, OSError):
        # Avoid dumping exception context that might contain SQL/password literals.
        raise SystemExit(
            'Setup failed. Check PostgreSQL availability, administrator credentials and privileges. '
            'If backend/.env.pending exists, keep it private: setup may have partially completed. '
            'Inspect the named role/database in pgAdmin before retrying. No existing data was deleted.'
        ) from None
    print('Created the development database and backend/.env. Administrator password was not saved.')
    print('Next: .\\scripts\\python.cmd scripts/dev.py migrate')
    print('Then: .\\scripts\\python.cmd scripts/dev.py createsuperuser')
    print('Finally: .\\scripts\\python.cmd scripts/dev.py runserver 127.0.0.1:8000')


if __name__ == '__main__':
    main()
