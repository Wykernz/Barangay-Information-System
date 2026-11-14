# Foundation progress

The user authorized building the foundation after the requirements handoff.
Open stakeholder decisions remain open.

Initial backend source includes environment configuration, PostgreSQL connectivity,
a custom user model, session/CSRF middleware, authenticated session inspection,
protected schema endpoint, and initial permission tests.

Python is not installed on the workstation. Backend dependencies, migrations,
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
