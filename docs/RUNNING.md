# Run BIMS on Windows

For the Payahan geographic map, database household links, native GIS prerequisites
and licensed online/offline map sources, see [GIS.md](GIS.md). The basemap works
with GIS storage disabled; saving household house locations requires PostGIS and
the native GIS runtime. Existing sample profiles are not database records.

If your ArcGIS browser key permits `localhost`, open **http://localhost:5173**
instead of `127.0.0.1:5173`. The latest replacement key was accepted for localhost
and rejected for 127.0.0.1. Use the hostname allowed by the key, or add the intended
origin in its ArcGIS website restrictions. Sign in again when switching hosts.

The current backend provides authenticated resident, household, housing-unit,
GIS, and health APIs, plus the overview and audit endpoints. These require a
migrated PostgreSQL database and staff permissions. Families, appointments,
complaints/cases, social-assistance programs, and document workflows remain
deferred or setup-only; do not enter operational data into their preview screens.

## Current workstation blocker

Windows Application Control blocked PostgreSQL 18's
`C:/Program Files/PostgreSQL/18/lib/plpgsql.dll` during verification. Database
initialization of a separate cluster failed and no database or staff account was
created by that attempt. The existing service on port 5432 is accepting connections;
use the recommended existing-server setup below first. If it also reports a policy
block, ask IT to repair or approve PostgreSQL; do not disable security controls.

The frontend can be served now with `npm.cmd run dev` from `frontend`; sign-in
requires a working database and API. A Python 3.12 environment exists at
`backend/.venv`; use `.\scripts\python.cmd scripts/dev.py ...` so it is selected
consistently. The field planner requires a staff account with form-definition
model permissions (a superuser works for local synthetic development).

The default `DJANGO_ENABLE_GIS=false` keeps the non-GIS field-planning foundation
available on a normal PostgreSQL backend. Before enabling GIS, install/approve
GDAL and GEOS, provision PostGIS, create the extension in the database, set
`DJANGO_ENABLE_GIS=true`, and run the full spatial migration/integration checks.
Do not enable it merely to test startup: the current workstation has no discoverable
GDAL library, so GeoDjango correctly refuses to start when the flag is enabled.

## First-time setup

### Recommended on this workstation: use existing PostgreSQL on port 5432

The existing PostgreSQL service was confirmed accepting connections. Use your
pgAdmin administrator account through this interactive helper; do not send its
password in chat or put it in a command:

```powershell
Set-Location C:\Users\ASUS\Barangay-Information-System
.\scripts\python.cmd scripts/setup_existing.py
```

Accept port 5432 if that is your server's port, enter the PostgreSQL administrator
username (usually `postgres`), choose a new database/role name, and enter the
password at the hidden prompt. This is the PostgreSQL server password, not a
pgAdmin master password. The helper creates a dedicated non-superuser account
and database and saves generated application credentials in ignored `backend/.env`.
It does not store your administrator password or overwrite existing names/files.

After success:

```powershell
.\scripts\python.cmd scripts/dev.py migrate
.\scripts\python.cmd scripts/dev.py createsuperuser
.\scripts\python.cmd scripts/dev.py runserver 127.0.0.1:8000
```

Create or assign staff roles only for the intended account. Use the commands in
[HEALTH_ACCESS.md](HEALTH_ACCESS.md); they grant `barangay_admin` access to the
main and Health workspaces, while `healthcare_admin` is limited to Health. A
superuser can access all model permissions during local setup, but is not a
substitute for provisioning the named staff accounts.

Keep Django running and start `npm.cmd run dev` in a separate frontend terminal.
Use the Django account you created to sign in. For this option, use your existing
PostgreSQL service; skip the `.local/postgres` start/stop commands below.

The application role deliberately lacks CREATEDB. To run database integration
tests, have the administrator provision a separate test database owned by that
role and run pytest with `--reuse-db`, or use a separately authorized test role.
Do not grant production application accounts database-administration privileges.

If `.env.pending` exists after failure, retain it privately and inspect the named
database/role in pgAdmin. Complete provisioning with your administrator before
renaming it to `.env`; do not blindly repeat setup or delete an existing database.

### Alternative: provision a separate local PostgreSQL cluster

Prerequisites: Node.js 24, Python 3.12 with a complete standard library, and
PostgreSQL server tools. Use PowerShell and synthetic development data only.

If this checkout already has a working runtime through `scripts/python.cmd`, skip
creating the environment. Otherwise, install Python 3.12 and run:

```powershell
Set-Location C:\Users\ASUS\Barangay-Information-System
py -3.12 -m venv backend/.venv
backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.lock
```

Create the development database and your staff account once:

```powershell
Set-Location C:\Users\ASUS\Barangay-Information-System
.\scripts\python.cmd scripts/setup_local.py
.\scripts\python.cmd scripts/dev.py migrate
.\scripts\python.cmd scripts/dev.py createsuperuser
```

Choose a synthetic staff username and strong password at the prompts. There is no
default password. Setup creates an isolated database at `127.0.0.1:55432` and stores
random credentials in ignored `backend/.env`. Database files are in ignored
`.local/postgres`. Existing system databases are untouched. The local database
role is a cluster administrator so it can create test databases; never use this
configuration or account for production.

The helper expects PostgreSQL binaries in `C:\Program Files\PostgreSQL\18\bin`.
Set `$env:POSTGRES_BIN` to a different bin directory if needed. It refuses to
overwrite an existing cluster or `.env`. If setup fails midway, inspect the error
and `.local/postgres.log`; do not delete database files as a troubleshooting shortcut.

## Daily startup

The initial setup starts PostgreSQL. After a reboot or manual stop, start it with:

```powershell
Set-Location C:\Users\ASUS\Barangay-Information-System
& 'C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe' -D .local/postgres -l .local/postgres.log -o '-h 127.0.0.1 -p 55432' -w start
```

Terminal 1 — API:

```powershell
Set-Location C:\Users\ASUS\Barangay-Information-System
.\scripts\python.cmd scripts/dev.py runserver 127.0.0.1:8000
```

Terminal 2 — interface:

```powershell
Set-Location C:\Users\ASUS\Barangay-Information-System\frontend
npm.cmd ci
npm.cmd run dev
```

Open **http://127.0.0.1:5173** and sign in with the account you created. If Vite
reports a different port, use its displayed URL. Run `npm.cmd ci` only initially
or when the lockfile changes. Vite proxies `/api` to Django on port 8000.

Press Ctrl+C in both terminals to stop the application. To stop the database:

```powershell
Set-Location C:\Users\ASUS\Barangay-Information-System
& 'C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe' -D .local/postgres -m fast -w stop
```

## Verification

With the database running:

```powershell
Set-Location C:\Users\ASUS\Barangay-Information-System
.\scripts\python.cmd scripts/dev.py check
.\scripts\python.cmd scripts/dev.py makemigrations --check --dry-run
.\scripts\python.cmd scripts/check_staff_roles.py
.\scripts\python.cmd scripts/check_resident_api.py
.\scripts\python.cmd scripts/test_backend.py
Set-Location frontend
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd audit
```

Backend tests create a separate test database. Never use production credentials.
The workspace fallback Python installation, when used, is under ignored `.tools/`.
The launcher prefers `backend/.venv` when available. The fallback interpreter is
for local synthetic verification only; install a current full Python release for
ongoing development and deployment. The fallback and packages are not committed.

## Troubleshooting

- `ModuleNotFoundError: No module named 'django'` after `runserver` with the
  fallback interpreter was caused by Django's auto-reloader launching
  `backend/manage.py` directly without the fallback package paths. The current
  launcher restores them in the child process, and Django auto-reload remains
  enabled. Restart an older server once after updating these launcher files.

- `Missing ... backend/.env`: database setup has not completed. Run
  `.\scripts\python.cmd scripts/setup_local.py` from the repository root first.
  After it succeeds, run `migrate`, `createsuperuser`, then `runserver` as shown
  above. Do not just copy the example and leave placeholder credentials. If setup
  reports the Application Control DLL block, resolve that with IT before continuing.
  The previous short handoff omitted this prerequisite.

- A blank 500 at `:5173/api/v1/session/` can come from Vite when Django is stopped.
  This was reproduced with port 8000 refusing connections. The development proxy
  now returns JSON with status 503 and the interface shows startup instructions.
  Restart Vite after pulling proxy changes. This does not repair the PostgreSQL
  Application Control block described above; database setup still needs IT action.
- If `/api/v1/overview/` returns Django's 404 page while `/api/v1/session/` or
  `/api/v1/residents/` returns JSON, the Django process is serving an older URL
  configuration or a different checkout. Stop it with Ctrl+C in the terminal
  where that backend was started, then from the repository root run:

  ```powershell
  .\scripts\python.cmd scripts/dev.py runserver 127.0.0.1:8000
  ```

  The fallback Python runtime now supports Django auto-reload. Restart the
  backend once after updating this launcher. If the route is still missing after
  restarting, confirm that the deployment/repository contains
  `backend/config/urls.py` from this checkout and redeploy the backend.
- The React DevTools console suggestion is informational and does not cause errors.
- Run `npm.cmd run format` in `frontend` to format TSX, TypeScript, and CSS;
  `npm.cmd run format:check` verifies formatting without changing files.

- Connection refused on port 55432: start the isolated database.
- Port in use: inspect the owning process; do not stop an unknown database.
- Missing `.env`: complete setup or configure a dedicated database using the
  fields in `backend/.env.example`.
- Login fails: confirm API/database availability and account creation; after too
  many attempts, wait five minutes for the development limiter to reset.
- Local HTTP requires `DJANGO_DEBUG=true`; production uses secure cookies.

Package installation needs internet; runtime assets are local. These commands bind
development services to localhost. LAN/TLS deployment, shared login throttling,
PostGIS, and production operations are separate remaining work.

See [REVIEW_GUIDE.md](REVIEW_GUIDE.md) for commit review commands.

## Registry migration reconciliation (2026-11-24)

The development database contained four applied resident/household migrations
that had been lost from the checkout during branch integration. Their exact
definitions were recovered from Git and restored. Current migrations now depend
on that preserved history, and model state includes the existing household,
housing-occupant, property, residency, and verification constraints. Do not fake
or delete these migration records. Run the following before schema work:

```powershell
.\scripts\python.cmd scripts/check_migration_history.py
.\scripts\python.cmd scripts/dev.py makemigrations --check --dry-run
```

The resident/overview rollback check is safe for the configured local development
database and leaves no synthetic records behind:

```powershell
.\scripts\python.cmd scripts/check_resident_api.py
```
# Backend validation follow-up (2026-11-23)

The fallback `scripts/python.cmd` launcher supports script paths, `-m` modules,
and `-c` commands. Django checks and tests still need the configured environment;
the launcher does not automatically read credentials.

Household API validation rejects closure dates earlier than establishment dates
on creation and partial updates. Unknown dates remain optional. The four
household serializer tests passed through pytest with the local environment
loaded using `scripts.dev.load_environment`; these checks do not use the database.

The full backend pytest run currently stops at setup: the configured PostgreSQL
role cannot create `test_bims_dev`. Provision an isolated test database with an
appropriate test role before running the database suite. Do not point Django's
test database at the operational database. Filtering with `-m 'not django_db'`
does not exclude Django TestCase classes and therefore does not bypass this
requirement. This is a test setup failure, not a passing backend suite.
