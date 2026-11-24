# Foundation progress

## Pre-capture profiling and GIS-ready foundation

Added a versioned field-definition API and real React **Field planner** for the
field-capture workshop. Drafts support explicit versions, typed fields, choices,
required/sensitive markers, ordering, and schema-driven preview. Activation and
archiving are explicit server-checked transitions; active forms are immutable.
Only active resident forms can supply validated resident extension values.

Added provisional UUID-based resident, household, housing, effective-dated
membership/occupancy, resident-revision, metadata-only audit-event, and optional
GeoDjango housing-location models/migrations. Resident verification records the
requesting verifier/time. Location corrections append revisions, and verification
records the requesting verifier/time. The remaining operational screens are still
synthetic and are not connected to these APIs.

GeoDjango is intentionally gated by `DJANGO_ENABLE_GIS` because GDAL is not
available on this workstation. Normal profiling checks/migrations run with the
flag off. PostGIS/GDAL/GEOS and spatial integration tests are unresolved; the
migration under `backend/gis` has not been applied or drift-checked against a
spatial database. Do not treat this as a production GIS verification.

`docs/DATA_CAPTURE_WORKSHOP.md` records tomorrow's workshop scope and open
approvals. No real resident fields, coordinates, exports, or data were added.

Verification: Ruff, non-GIS Django checks, migration drift (with the known test
credential connection warning), OpenAPI validation, eight profiling/household
unit tests plus four database-independent auth rejection tests, frontend strict
TypeScript, 13 frontend tests, and the production frontend build passed. Database
integration, browser E2E, full authorization workflows, and spatial checks were
not executed. The field planner still needs the documented PostgreSQL `.env`,
migrations, and an appropriately permitted staff account.

## Explicit session schema and backend revalidation

Declared the authenticated session response for drf-spectacular so the generated
OpenAPI document no longer omits `/api/v1/session/`. This is documentation of the
existing username-only response; it does not add fields, permissions, or domain
behavior. A database-independent regression test verifies the response component.

Revalidation on 2026-11-16 reached the configured PostgreSQL server. Migration
drift check reported no changes. The full backend suite could not create its
isolated `test_bims_dev` database because the application role intentionally lacks
`CREATEDB`; all ten database tests therefore stopped during setup. Provision a
separate authorized test database/role or temporarily grant the documented test
capability before treating the suite as executed evidence. Deployment checks also
retain the expected local-development HTTPS, secure-cookie, HSTS, and DEBUG
warnings; production values remain a deployment decision.

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

The user completed migrations on the existing PostgreSQL service. Django's
reloader launched `backend/manage.py` directly, losing package paths injected by
the embeddable runtime. `manage.py` now restores those paths for the fallback
runtime, and Django auto-reload remains enabled. Existing servers still need one
manual restart to load the updated URL configuration.

Verification: Django started on temporary loopback port 8001 with the StatReloader.
Unauthenticated requests to overview and residents returned 403, confirming the
current source routes are present and authentication is enforced. The synthetic
resident API smoke check also passed for create, update, verify and overview; all
temporary records, role grants, revisions and audit events rolled back.

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
