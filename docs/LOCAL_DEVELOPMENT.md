# Local development

For the complete current first-time setup and daily startup procedure, use
[RUNNING.md](RUNNING.md). The manual environment-variable approach below remains
available for independently provisioned development databases.

## Frontend

```powershell
Set-Location C:\Users\ASUS\Barangay-Information-System\frontend
npm.cmd install
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run dev
```

The Vite server binds to localhost. `/api` requests are proxied to Django at
127.0.0.1:8000 so sessions and CSRF use the same browser origin. No CDN resources
are required at runtime. Development dependency installation requires internet.

## Backend

Install a supported Python 3.12+ runtime. Create a virtual environment, install
`backend/requirements.txt`, and set the environment variables shown in
`backend/.env.example` in the same PowerShell session. The example is not loaded
automatically. Use a dedicated local PostgreSQL development database and account.

```powershell
Set-Location C:\Users\ASUS\Barangay-Information-System\backend
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.lock
# Set environment variables before the following commands.
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe -m pytest
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py createsuperuser
.\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

The initial user migration is committed; review it before applying it.
Tests require a database role allowed to create the isolated test database.
Use only synthetic accounts locally. Account creation has no public endpoint.

## Current limits

The login guard allows ten attempts per source IP per five-minute window using
Django's cache. The default in-memory cache is only suitable for single-process
development. Select a shared cache or proxy enforcement before multiple workers.
Do not trust forwarded IP headers without a reviewed proxy configuration.

Audit services, database integration checks, full toolchain checks,
Tailwind/shadcn UI integration, and operational modules remain foundation work.
No deployment or production readiness is implied by this local scaffold.
