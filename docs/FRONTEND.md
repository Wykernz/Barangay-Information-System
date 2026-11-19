# Staff frontend review

Household family cards, member management and contextual registration are
documented in [HOUSEHOLD_UI.md](HOUSEHOLD_UI.md). Birthdates use a single
month/day/year control with a typed year; age groups follow [AGE_GROUPS.md](AGE_GROUPS.md).
Resident classification, optional middle name and voluntary demographic fields
are part of this synthetic preview. Profiles and relationship history remain in
session memory and reset on reload/sign-out.

## Backend-persisted field planner

`/data-capture` is a real Django-backed workshop workspace for versioned resident,
household, housing, survey, and GIS field definitions. Staff with the model
capabilities can create/edit drafts, add typed fields and controlled choices,
mark sensitivity, reorder fields, preview the possible layout, and activate or
archive saved versions through explicit confirmation. Active/archived versions
are read-only. New drafts accept an explicit version number so workshop changes
can become a new contract rather than mutating an active version.

TanStack Query handles list/detail states and saves; failed requests retain local
editor changes without browser storage. The preview does not collect operational
values. Field approval, privacy review, and permissions remain stakeholder
responsibilities. The workspace banner distinguishes this persistent planner
from the synthetic in-memory module previews.

## Synthetic module previews
Current handoff: FRONTEND_CHANGELOG.md and PROFILING_WORKFLOW.md consolidate the
current implementation. Historical descriptions below predate survey deferral,
connected profiling screens and final operational UI wording.

Surveys are deferred at the user's request. Survey navigation, routes, household
panels and dashboard links/indicators are removed from the active interface.
Underlying synthetic survey fixtures and draft contracts are retained for later
review; no records or backend data were deleted.

The approved visual refresh adds profiling-scoped design tokens, breadcrumbs,
icon actions, accessible feedback, readable tables and refreshed native dialogs.
It preserves existing profiling handlers and fields. Lucide React is the only
new runtime dependency. See PROFILING_WORKFLOW.md for validation and limitations.

Profiling routes now use dedicated connected profiles and relationship history.
See PROFILING_WORKFLOW.md and PROFILING_API_CONTRACT.md for scope and handoff.

The authenticated staff workspace now contains frontend previews for resident,
household, housing, survey, appointment, case, service, and staff directories;
an overview dashboard; GIS readiness/directory; aggregate reports; activity;
and settings. Login/logout remain connected to Django.

## What works in this increment

- Sidebar routes, active navigation, mobile menu, skip link, and unknown-route page.
- Search/status filtering, empty states, add/edit forms, cancellation, and feedback.
- Birthdate checks, dynamically calculated age, duplicate-name warnings, simple
  demo appointment slot conflicts, and service opening/capacity validation.
- Counts derived from shared demo state, synthetic aggregate CSV download,
  session activity history, and reset confirmation.
- Readable source formatting and comments explaining demo boundaries and behaviors.

## Demo boundary and remaining work

All operational records are explicitly synthetic. Edits exist only in React memory;
they reset on reload or sign-out. No domain API writes or browser storage are used.
Do not enter real personal information. Staff previews grant no account permissions.
Case previews contain no confidential records. This is not production authorization.

The GIS page deliberately has no geographic layer or house coordinates. Mapping
requires verified licensed data and the later GIS API. Sensitive declarations,
evidence uploads, household membership history, full demographic forms, detailed
analytics, configurable capacity semantics, real reports, and server permissions
still need approved contracts and implementation. The current slot-conflict rule
is a UI demo rule, not an approved appointment capacity model.

Tailwind/shadcn, React Hook Form/Zod, Recharts and Leaflet integration remain
outstanding stack work; current components use React, semantic HTML, shared CSS,
React Router, Axios, and TanStack Query. Browser E2E/accessibility verification is
still required. This increment is a reviewable frontend prototype, not the entire
production-ready interface.

## Code map

- `frontend/src/App.tsx`: actual authentication and session boundaries.
- `frontend/src/Workspace.tsx`: navigation and routes.
- `frontend/src/demo/`: typed synthetic catalog and in-memory state adapter.
- `frontend/src/components/RecordPage.tsx`: shared directory and inline editor.
- `frontend/src/pages/`: dashboard, GIS readiness, reports.
- `frontend/src/planner/`: typed API, versioned definition editor, preview, styles, tests.
- `frontend/src/styles/workspace.css`: grouped layout, table, form, and responsive styles.

Run Django and Vite as described in `RUNNING.md`, sign in, and review the routes.
Use `npm.cmd run format`, `npm.cmd run build`, and `npm.cmd test` in `frontend`.
