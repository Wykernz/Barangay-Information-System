# Foundation progress

## Frontend module prototype

Added responsive authenticated navigation, a derived dashboard, searchable editable
synthetic directories, GIS readiness, demo CSV summaries, session activity, and
reset settings. Shared components, typed fixtures, and commented CSS separate
layout, state, and module concerns. Domain records remain in-memory demo data;
login/logout use the real backend. Detailed scope and gaps: `FRONTEND.md`.

Verification: frontend TypeScript/production build passed; six API/component tests
passed. Browser E2E and real domain API integration were not verified. The full
production frontend and all requested library integrations are not yet complete.

## Fallback Django server startup fix

The user completed migrations on the existing PostgreSQL service. The subsequent
runserver failure occurred because Django's reloader launched manage.py directly,
losing package paths injected by the embeddable runtime. The fallback runner now
marks its runtime, and dev.py adds `--noreload` only for that runtime's runserver.
Normal virtual environments keep auto-reload. Restart fallback servers after edits.

Verification: started Django on temporary loopback port 8001; system checks passed,
unauthenticated session returned the expected HTTP 403, and CSRF bootstrap returned
HTTP 200. These checks establish server startup, not a full authenticated workflow.

## Existing PostgreSQL setup

Added `scripts/setup_existing.py` after confirming an existing local PostgreSQL
server accepts connections on port 5432 and the user has administrator access.
The interactive helper creates a dedicated non-superuser role/database, prompts
for administrator credentials locally, and saves generated app credentials in
ignored `.env`. It refuses existing names/files and retains a private `.env.pending`
for recovery after partial failure. No administrator password is saved.

Five isolated setup tests passed (identifier validation, existing file preservation,
role collision, successful configuration, and partial-failure recovery). Real
provisioning still requires the user to enter their password locally; it was not
performed by the assistant. See `RUNNING.md` for the exact command and next steps.

## Session proxy diagnosis and frontend readability

Reproduced a blank HTTP 500 from Vite at `/api/v1/session/` while direct access
to port 8000 refused the connection. Django was stopped. Added a proxy error
handler returning JSON HTTP 503, development-only startup instructions, explicit
retry behavior, and disabled session refetch on window focus. No authentication
or database checks are bypassed.

Formatted frontend TS/TSX/CSS with Prettier, added CSS section comments and
authentication/proxy comments, and added repeatable format commands. Verified
the live proxy returns 503 with `backend_unavailable`; frontend build, two API
tests, and formatting check passed. PostgreSQL's Application Control block still
prevents full local sign-in. Backend startup remains an environment prerequisite.

The user authorized building the foundation after the requirements handoff.
Open stakeholder decisions remain open.

Initial backend source includes environment configuration, PostgreSQL connectivity,
a custom user model, session/CSRF middleware, authenticated session inspection,
protected schema endpoint, and initial permission tests.

At the initial scaffold stage, Python was not installed. Backend dependencies, migrations,
and tests must be executed after Python 3.12+ is available. Do not migrate before
generating and reviewing the custom user's initial migration.

The PostgreSQL backend is intentionally nonspatial until native GeoDjango libraries
and PostGIS availability are verified. GIS is not yet implemented.

Next work: install/verify the Python runtime, resolve and lock dependencies,
generate initial migrations, execute PostgreSQL integration tests, implement
login throttling and audit services, and build the React staff shell.

## Staff shell increment

Added the React/TypeScript/Vite staff shell, TanStack Query session handling,
React Router, Axios CSRF handling, sign-in/out forms and endpoints, connection
failure/retry states, and responsive local styles. Backend tests now cover CSRF,
login/logout, and inactive accounts. Login attempts have a development cache limit;
deployment needs a shared limiter. Audit services are still pending.

Frontend dependency installation completed and generated a lockfile. Type checking,
production build, and the two session API unit tests passed on the initial run.
An audit found test-tool vulnerabilities; the test runner was upgraded to a
compatible patched release before the final validation. See the implementation
handoff for the final audit outcome. Final rerun: build passed, both tests passed,
and npm audit reported zero vulnerabilities with Vitest 5.1.0.

The MySQL Workbench bundled Python prints a version but cannot initialize its
standard library independently. It is not a usable backend development runtime.
Backend migrations and tests remain unexecuted. No database was modified.

Local commands and current limitations are in `LOCAL_DEVELOPMENT.md`. Browser
interaction and backend integration have not yet been verified.

Compatibility references checked: Django 5.2 installation FAQ,
https://docs.djangoproject.com/en/5.2/faq/install/ ; DRF requirements,
https://www.django-rest-framework.org/ ; Vite guide, https://vite.dev/guide/ .
Dependency ranges are provisional until a successful resolver and test run.

## Local tooling and documentation increment

Added local configuration loading, a runtime launcher, database setup and test
helpers, complete Windows startup instructions in `RUNNING.md`, and commit review
instructions in `REVIEW_GUIDE.md`. `AGENTS.md` now records the user's requirement
for documented implementation commits with explanatory bodies and pushes.

Installed Django 5.2.19 and related backend dependencies in ignored local tooling.
Generated and reviewed `accounts/migrations/0001_initial.py`, including the custom
user, group membership, and permission fields. It has not been applied.

Executed evidence:

- Django `check`: no issues.
- Migration drift check: no changes detected; database-history verification
  emitted a connection-timeout warning because PostgreSQL was unavailable.
- pytest `-q -k malformed`: 4 passed; 6 database-dependent tests deselected.
- Python compilation of backend and scripts: passed. Git whitespace check: passed.
- Backend dependency lockfile resolved successfully with exact package versions.
- PostgreSQL setup: failed because Windows Application Control blocked
  `C:/Program Files/PostgreSQL/18/lib/plpgsql.dll`; initdb automatically removed
  its incomplete cluster. No operational data existed there. No `.env` was created.
- Full Python managed installation: blocked by Windows directory/file policy;
  official embeddable Python 3.12.10 used only as an isolated local fallback.

Next action requiring the workstation owner/IT: repair or approve PostgreSQL's
blocked native library, then run setup, migrate, create a synthetic account, and
execute all database tests. Use a current full Python runtime for ongoing work.
Audit services, role capabilities, PostGIS, UI toolkit integration, browser E2E,
and production operations remain incomplete.
