# Current profiling workflow

Status: frontend implemented with session-memory sample records. Django login is
live; profiling endpoints/persistence remain backend integration work.

## Navigation and reference

Reference: https://kinain-nipedro-si-maria.netlify.app/ . Its public bundle and
local source were inspected. Active routes are /residents, /households, /housing
and their /:id details. Surveys are deferred: no sidebar link, route, household
panel or dashboard indicator. Survey source/fixtures/contracts remain for later.

## Resident workflow

Surname-sorted searchable registry → profile → edit dialog. Forms support structured
name, birthdate, sex, civil status, household and relationship. Age is derived.
Future birthdates are rejected; duplicate names warn for manual review. Registration
from a household opens its form with household context and assigns on save. Member
profiles retain a household return link.

## Household and housing workflow

The 2026-11-19 household usability update is documented in
[HOUSEHOLD_UI.md](HOUSEHOLD_UI.md), including how to add a second family and its
members. Family cards and a searchable member list replace inline family dropdowns
and crowded per-person actions. New-person registration preserves household/family
context and returns to the household on save. Family and membership history remain
available; less-used summary sections are expandable.

Registry shows head, purok, member count and housing material. Details summarize
head, purok, housing, water, toilet/CR and members. Add/edit selects eligible heads
and separate housing units. Assignment/transfer/unassignment and head changes use
confirmations and preserve historical segments. Occupancy moves retain previous
assignments. Units remain separate and may accommodate multiple households.

The fictional sample data contains seven profiles and four households/units.
The user-supplied demo aliases replace the previous display names. The original
six profiles retain fictional attributes and relationships; the seventh starts
unassigned with demographic details not recorded. These are not real resident
records or assertions about the people whose names were supplied.
Demo-alias validation (2026-11-20): typecheck passed using the reduced-memory Node
command documented in `HOUSEHOLD_UI.md`; the single-worker Vitest suite passed
11 files / 53 tests. The four modified TypeScript files were formatted with
Prettier. Existing relationships and synthetic attributes were retained.
No screen-position coordinates are imported; all locations remain unmapped.

## Building use (user approved 2026-11-20)

Housing-unit creation and editing include one **Building use** dropdown:

| Category | Meaning |
|---|---|
| Residential | Houses, apartments, boarding houses |
| Commercial | Stores, shops, restaurants, businesses |
| Mixed-Use | House with a sari-sari store or another business |
| Institutional | Schools, barangay halls, health centers |
| Other | Properties outside the categories above |

Existing and unknown values display **Not recorded**. A household living in a
unit does not automatically classify it as Residential. Classification does not
create or remove households, people or occupancy history, and describes use
rather than official zoning, permits or legal status.

Building use is visible in the housing registry, profile details, linked-household
observations and unmapped housing directory. Housing registry and directory filters
can select a category or Not recorded. No map geometry or location is invented.
Selection is stored in synthetic session state and resets on reload/sign-out;
backend persistence and production schema are not part of this increment.

Validation: reduced-memory TypeScript check passed; single-worker Vitest with
`--configLoader runner --maxWorkers=1` passed 11 files / 59 tests. Vite production
build with `--configLoader runner`, targeted Prettier check and `git diff --check`
passed. Browser visual/keyboard acceptance remains outstanding.

## Removal and recovery

Delete archives rather than hard-deletes. Resident removal ends active membership;
households with current members and units with occupants block removal. Archived
records can be restored without silently reopening past memberships/occupancies.
No operational records or database data were removed.

## Design and implementation boundaries

Profiling-scoped navy/blue/teal tokens, readable tables/cards, breadcrumbs, icon
row actions, accessible feedback, native modal focus/Escape handling, responsive
grids and reduced-motion styles. Sidebar remains stationary with independent
navigation overflow. Lucide React 1.73.0 is the sole added UI dependency.

No backend code, schema or endpoint was modified. Shared record-page changes are
wording only. Dashboard changes remove survey indicators/links and update wording;
appointment/case/staff workflows and authentication behavior remain intact.

## Validation and handoff

Build/typecheck, formatting and 16 tests passed before the final documentation
handoff. Browser visual/keyboard/E2E testing remains outstanding; no production
readiness or pixel-identical clone is claimed. See FRONTEND_CHANGELOG.md for the
change inventory, RUNNING.md for startup and PROFILING_API_CONTRACT.md for proposed
backend integration. Commit/push was explicitly requested for the latest handoff.
