# Practical Phased Implementation Plan

## Gate 0 — Approve the baseline

Review the SRS, terminology, ERD, decisions, risks, requirement priorities, and
acceptance ownership. Resolve the blocking items identified in `DECISIONS.md`.

Exit evidence: signed/recorded approval, named owners, prioritized pilot scope,
and an accepted role/permission outline.

## Phase 1 — Project foundation

- Select and pin maintained compatible Python, Django/GeoDjango, DRF, PostgreSQL/
  PostGIS, Node, React, Vite, Tailwind, and test-tool versions using official matrices.
- Establish backend/frontend layouts, environment validation, secret scanning,
  lint/type/test commands, CI, and synthetic fixtures.
- Create custom user before the first Django migration, session/CSRF baseline,
  capability authorization primitives, audit events, and health/readiness checks.
- Establish schema/OpenAPI and migration conventions.

Gate: clean build/lint/tests, reviewed initial migrations, no committed secrets,
and an executable local setup on the chosen deployment baseline.

## Phase 2 — Profiling vertical slices

Implement resident identity/verification, then household and housing unit, then
effective-dated membership/occupancy, controlled classifications, surveys, and
restricted health data only after field/access approval. Each slice includes UI,
API, service, constraints, permissions, audit, documentation, and tests.

Add migration staging early, but ingest only synthetic/sample records until the
controlled migration process and privacy safeguards are approved.

## Phase 3 — GIS

Complete paper-map provenance and QGIS validation first. Add boundaries and
optional housing locations with source/accuracy/verification/history. Implement
local licensed map resources and disconnected-network tests. Field coordinates
wait for an approved collection method.

## Phase 4 — Staff appointments

After service and capacity rules are approved, implement configuration, scheduling,
transaction-safe conflicts, status history, and summaries. Keep it staff-only.

## Phase 5 — Restricted complaints/cases

Proceed only after legal/privacy review of workflow, access, attachments, and
retention. Build explicit case authorization, append-oriented activities, secure
attachments, and confidentiality tests before broader UI access.

## Phase 6 — Analytics and reports

Approve metric definitions and disclosure controls, then implement canonical
aggregate services, dashboards, missing/unverified indicators, and protected exports.

## Phase 7 — Deployment readiness

Perform representative load/accessibility/security testing, migration rehearsals,
backup restoration, internet-disconnected LAN tests, monitoring/incident drills,
training, UAT, cutover rehearsal, and privacy/legal/operational sign-offs.

## Work that is safe now

- Stakeholder workshops and document review
- Controlled inventory of source systems and paper records (no repository uploads)
- Hardware, LAN, power, and operator-skills survey
- Paper-map provenance/licensing assessment
- Synthetic prototypes and version-compatibility research
- Definition of role capabilities, metrics, vocabularies, and acceptance tests

Major implementation should wait for baseline approval as requested.

