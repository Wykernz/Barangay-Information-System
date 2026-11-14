# Run BIMS on Windows

The current application provides staff sign-in and a workspace shell. Operational
resident, household, GIS, appointment, and case modules are still pending.

## Current workstation blocker

Windows Application Control blocked PostgreSQL 18's
`C:/Program Files/PostgreSQL/18/lib/plpgsql.dll` during verification. Database
initialization of a separate cluster failed and no database or staff account was
created by that attempt. The existing service on port 5432 is accepting connections;
use the recommended existing-server setup below first. If it also reports a policy
block, ask IT to repair or approve PostgreSQL; do not disable security controls.

The frontend can be served now with `npm.cmd run dev` from `frontend`; sign-in
requires a working database and API. Django configuration checks and four
database-independent tests passed with the fallback runtime.

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
  fallback interpreter was caused by Django's auto-reloader launching a new
  process without the fallback package paths. The launcher now automatically
  disables auto-reload for that runtime. Use the same startup command, and restart
  manually after backend edits. A normal virtual environment retains auto-reload.

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
