# Staff frontend review

The 2026-11-22 overview refresh reads aggregate resident, household, housing,
occupancy, and optional GIS counts from `/api/v1/overview/`, with server-side
registry permissions. Family and 4Ps figures are shown as unavailable until
their database workflows exist; recent database audit activity is also pending.
The shared sidebar now groups only working routes, and the refreshed teal tokens
apply across the existing staff shell. Session sample records remain labeled in
profiling and are excluded from overview totals.
The Residents registry adds purok and record-status filters, and registry tables
paginate ten visible rows per page without altering stored records.
The Housing Map now shows distinct linked-unit coverage, searches household and
housing-unit references, labels, house numbers, and recorded coordinates, and
filters its directory by household active status. The map keeps its existing
provider, marker, directions, and location-save behavior. Purok filtering
awaits a reviewed database field and is not inferred from map position.
The Household Registry now uses the authenticated, paginated database map API,
with reference search, status and map-location filters, View and Map actions,
and a matching database-backed detail page. Only API-supported values are shown;
head, member, family, and purok fields remain unavailable. Counts that would
require a dedicated aggregate endpoint are not estimated from the loaded page.

The full-page resident create/edit form follows the user-supplied Modern BIMS Person Profile
Form reference: wide navy heading, left photo card, grouped blue information
sections, and bottom Cancel/Save controls. It stacks on small screens and retains
the existing birthdate control, validation, generated fields, private uploads,
assignment controls and database adapter. See RESIDENT_PROFILING.md for scope and
verification. This update does not change other module layouts or account access.

The read-only resident page uses the same photo panel and four information
sections as the edit form. Household membership history remains below the
profile; the archive action is separate from the information fields.

Resident fixed fields and private photos now use database-backed registration
and editing in the workspace. See [RESIDENT_PROFILING.md](RESIDENT_PROFILING.md)
for the field contract, existing local-profile distinction, migrations and checks.
The household/family relationship adapter remains session only.

The 2026-11-19 professional interface refresh supersedes older visual descriptions
below. See [UI_REFRESH.md](UI_REFRESH.md) for the shared palette, navigation,
overview, form layouts, executed checks, and browser-review limitations.

Household families/member management now uses dedicated cards, search/filter and
focused dialogs. See [HOUSEHOLD_UI.md](HOUSEHOLD_UI.md) for the second-family and
new-member flows, historical rules and current verification results.

Profile submission validates every required field before changing session state.
Required dropdowns use browser validation, and required text rejects whitespace.
Fields explicitly marked optional remain optional; declined sensitive answers
are permitted rather than forcing disclosure.

Overview category links open filtered registry views for residency, sex, voluntary
LGBT identification, PWD, seniors, age bands and missing birthdates. Demographic
links use the same classified-resident scope as the cards. Clear category removes
the demographic constraint; registered-person and housing cards open full lists.

Logo slot: overview header, profile-table identity and sidebar share
`components/BarangayLogo.tsx`. The temporary neutral house emblem is served
locally from `frontend/public/barangay-logo.svg`. Replace that file with the
approved SVG to update all placements. For PNG/JPG, update the component's image
filename. The placeholder is not an official barangay seal.

Overview includes resident age-group cards and missing-birthdate counts, calculated
from active classified residents. Bands use the eight user-approved mutually exclusive ranges; ages 75+ await classification.

Overview visual update: reference-inspired teal/white header, left profile table,
right two-column record-summary cards, gold section heading and responsive stacked
layout. Uses a neutral icon rather than an official seal. Existing count rules and
session-preview labeling remain unchanged; no appointment/complaint widgets return.

Household Water supply is a dropdown covering piped/communal water, deep/shallow
wells, springs, rainwater, delivered water, bottled/refilling stations, Other and
Not recorded. Previously entered session values remain selectable when editing.

Household details support labeled family groups and assignment of existing
household members to one group or no group. Reassignment retains ended membership
segments. Families do not create new people, household heads, or housing units.
This remains synthetic session state and resets on reload/sign-out.

## Requested profiling capture additions (synthetic preview)

Resident registration/editing includes required Resident/Non-resident selection
and an optional middle name. Existing synthetic people remain unclassified until
staff choose a value. Classification appears in profile details and household
member lists; household membership never assigns a classification automatically.
Birthdates derive mutually exclusive age bands and senior status without storing age.
Household details summarize those age bands for current members and report
missing birthdates. Counts are derived from linked people, not independently
entered household totals.
Household forms include municipality, barangay, survey date, interviewer, water
supply, and toilet type. These additions use session memory, not database capture.
Health, pregnancy/family-planning categories and NHTS/insurance identifiers remain
pending protected workflows and agreed definitions.

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

Birthdate usability: registration and editing offer month/day selectors and direct year entry, alongside full-date entry. A complete valid birthdate remains required and future dates are blocked. The overview omits the redundant missing-birthdate count (PRO-002, ANA-002, NFR-ACC).

Validation: npm.cmd run build passed TypeScript but default Vite config bundling hit filesystem access denial; npm.cmd test -- --run hit the same loader restriction. npx.cmd vite build --configLoader runner passed; npx.cmd vitest run --configLoader runner passed all 10 files / 40 tests. Existing unrelated worktree edits were preserved; this increment was not committed or pushed separately.

Age-group validation (2026-11-19): npm.cmd run typecheck passed; npx.cmd vitest run --configLoader runner passed 10 files / 41 tests; npx.cmd vite build --configLoader runner passed. Existing unrelated worktree edits preserved; this increment was not committed or pushed separately.

Birthdate control update: one month/day/year row replaces the duplicate full-date picker. Year accepts direct typing without number spinners. Required, valid calendar-date and future-date checks remain enforced.

Date-control validation: npm.cmd run typecheck and npx.cmd vite build --configLoader runner passed. Regression suite uses npx.cmd vitest run --configLoader runner, including birthdate validity and profile save/edit coverage. Changes remain local alongside existing unrelated work.


Housing Units UI: /housing uses the existing database API for paginated records, house-number/address search, active status filtering, staff-authorized creation, and current household occupancy details. The UI intentionally omits preview-only building materials, utilities, and classifications absent from the persisted model. Older occupancy periods remain visible in the database but are not summarized as current.


Reports reads the authorized overview aggregate endpoint and exports aggregate counts only. The Activity Log reads the paginated, permission-gated audit event projection and filters by search, action, staff username, and date range. Housing overview cards use the database overview and housing-unit list; GIS totals are shown as unavailable when the permission or source is absent.

The routed Residents directory excludes session-only profiles and keeps database-backed create/edit actions. Household registration creates a database Household record only; membership, family, and housing occupancy remain separate. Families, Social Assistance, and Barangay Forms have setup-status routes that expose no fake records while their source APIs and approvals are pending.

Database resident details have tabs for personal/residency data, protected household memberships, family-readiness status, a separate Health workspace link, and filtered audit history. Sensitive health values are not duplicated into the profiling view.
