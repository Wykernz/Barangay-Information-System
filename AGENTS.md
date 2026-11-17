# Repository Working Agreement

## Purpose and current phase

This repository contains a production-oriented Barangay Information Management
System (BIMS) for one Philippine barangay. Work is phased. The current baseline
includes an authorized project foundation and a pre-capture field planner with
provisional synthetic domain scaffolds. Production domain workflows and real-data
use still require resolution of their open stakeholder decisions; draft form
activation is not field, privacy, legal, or GIS approval.

## Non-negotiable rules

- Use synthetic data only. Never commit resident data, credentials, exports,
  database dumps, private keys, or environment files.
- Do not invent official boundaries, coordinates, legal workflows, retention
  periods, or public-service requirements.
- Keep residents, households, and physical housing units as separate concepts.
- Preserve membership, case, appointment, and location history. Avoid hard or
  cascading deletion of operational records.
- Calculate age from birthdate; do not persist a maintained age field.
- Enforce authorization on the server. UI visibility is not a security control.
- Sensitive health and complaint access is explicit and is not implied by an
  administrative role.
- PostgreSQL/PostGIS is authoritative. Do not expose it or the application
  server directly to the public internet.
- LAN operation must not depend on an internet service or CDN.
- Record unresolved choices in `docs/DECISIONS.md` before coding assumptions.

## Intended architecture

- Modular monolith: Django/DRF/GeoDjango backend and React/TypeScript frontend.
- Versioned REST endpoints under `/api/v1/`.
- Django apps own bounded domains; non-trivial workflows live in service layers,
  not views or serializers.
- Configuration comes from validated environment variables. Commit only a safe
  `.env.example` when implementation begins.
- Use migrations, transactions, constraints, structured logging, and audit events.
- Keep API schemas explicit and generate OpenAPI with drf-spectacular.

## Proposed source layout

```text
backend/       Django project and domain apps
frontend/      Vite React application
docs/          Requirements, architecture, operations, and decisions
infra/         Local deployment configuration (after approval)
scripts/       Repeatable maintenance and validation scripts
```

## Development conventions

- Python: type annotate public/service interfaces; format and lint with Ruff;
  test with pytest and pytest-django.
- TypeScript: strict mode; ESLint and Prettier; Vitest/Testing Library for units;
  Playwright for approved end-to-end workflows.
- Prefer small modules, descriptive names, and explicit domain terminology.
- Validate at API and domain boundaries; back invariants with database constraints.
- Any schema or security change requires tests and corresponding documentation.
- Use PowerShell-compatible commands in project documentation.

## Expected commands (after project foundation exists)

```powershell
# Backend
Set-Location .\backend
python -m ruff check .
python -m pytest
python manage.py check --deploy
python manage.py spectacular --validate --file schema.yml

# Frontend
Set-Location .\frontend
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test -- --run
npm.cmd run build
npm.cmd run test:e2e
```

These are target commands, not evidence that tooling is installed or tests pass.
Record actually executed checks in the phase handoff.

## Safe change procedure

1. Read `docs/SRS.md`, `docs/ARCHITECTURE.md`, and `docs/DECISIONS.md`.
2. Confirm the requirement is approved and trace it in
   `docs/REQUIREMENTS_TRACEABILITY.md`.
3. Inspect the worktree and preserve unrelated user changes.
4. Implement the smallest coherent change with migrations and tests.
5. Run relevant checks; report exact commands and failures honestly.
6. Update documentation and the decision register when behavior changes.
7. Ask before destructive operations, data migrations, or major implementation
   beyond the approved phase.

## Commits and handoffs

The user requests documentation, descriptive commits, and pushes for implementation
increments. Include a concise conventional commit title and a body describing
behavior, rationale, executed validation, and remaining limits. Keep related run
instructions current. Use `docs/REVIEW_GUIDE.md` for review conventions and
`docs/RUNNING.md` for Windows startup. Preserve unrelated worktree changes.

