# Requirements Traceability (Initial Structure)

Status values: Draft, Approved, Implemented, Verified, Deferred.

| Requirement group | Source | Design location | Planned verification | Status |
|---|---|---|---|---|
| Person Profile form layout based on supplied image | User reference image 2026-11-21 | `ResidentProfileLayout.tsx`; person-profile dialog variant; `personProfile.css` | Desktop/mobile browser screenshots with synthetic API stubs; overflow, footer reachability, generated/blank values and Escape checks; existing form regression suite | Implemented; native dialog behavior and approved data contract retained |
| Expanded resident identity/contact/residency fields and private profile photo | User field list 2026-11-21; PRO-001..003, NFR-SEC/PRI | Resident model/serializer; protected photo action; profiling form/store; `docs/RESIDENT_PROFILING.md` | Read-only IDs/date/age; validation; photo limits/access; persistence and form tests | Implemented; 111 frontend and 87 non-database backend tests passed, PostgreSQL rollback smoke passed; full backend suite blocked by test-database privileges; local relationships remain session only |
| Healthcare admin restricted to Health; barangay admin explicitly allowed both workspaces | User authorization 2026-11-21; IAM-003/004/006 | `accounts/access.py`; staff role service/commands; `docs/HEALTH_ACCESS.md` | Direct API denial, conflicting roles, group assignment, session routing and password handling tests | Authorized implementation; specific account names pending |
| Hybrid imagery and matching labels | User approval 2026-11-20 | `map_config.py`; `EsriHybrid.ts`; `docs/GIS.md` | Credential fallback/default tests; layer alignment/credits; switching; audit/build; actual imagery/labels HTTP 200 with localhost referrer | Implemented; publishing to verified user fork authorized; provider origin restrictions apply |
| Online authorized-staff-only deployment replaces offline/LAN-first target | User confirmation 2026-11-20 | SRS GIS-007/NFR-AVL-001; Architecture sections 1/2/7; DEC-004/010/012 | Future production HTTPS, authorization, private-network and recovery validation | Scope confirmed; hosting/deployment not yet implemented |
| House Directions action | User request 2026-11-20 | `Directions.tsx`; household details; map sidebar; `docs/GIS.md` | Saved-coordinate URL, missing/rejected/invalid locations, no external request on render, both entry points | Implemented for review; Google Maps opens externally; requires saved location and internet |
| House-number entry and source-backed flood/fire overlays | User clarification 2026-11-20; PRO-004/005; GIS-009 | `docs/GIS.md`; HousingUnit.house_number; frontend GIS layer controls | Number validation/server permissions; shared-house persistence; manifest/geometry/legend validation and toggles | Commit/push authorized; hazard sources and database drift resolution pending |
| GIS Payahan increment: center, providers, sourced boundary, location revisions, household/map navigation, unmapped state, offline layers | User request 2026-11-20; GIS-001..008 | `docs/GIS.md`; `backend/gis`; `frontend/src/features/gis` | 24 backend checks passed, 2 native integration tests skipped; 68 frontend tests passed; boundary extraction and provider requests checked | Implemented; live PostGIS validation, official boundary sign-off, licensed high-resolution satellite and offline assets remain pending |
| IAM-001..008 | Project brief | Architecture sections 3, 5, 8; ERD Security | Model/migration, permission, session, audit, export tests | Draft |
| PRO-001..013 | Project brief | Architecture sections 2-3, 6; ERD Profiling; `backend/profiling`, `backend/households`; frontend `planner` | Unit, constraints, API, duplicate, count, authorization tests | Draft; extension/model scaffold only |
| APT-001..006 | Project brief | ERD Appointments | Service, transition, concurrency/conflict, API tests | Draft |
| CAS-001..006 | Project brief | Architecture sections 5, 8; ERD Cases | Confidentiality, assignment, workflow, attachment, audit tests | Draft |
| GIS-001..008 | Project brief | Architecture sections 2, 6, 9; ERD GIS; `backend/gis` | Geometry/CRS validation, authorization, history, offline map tests | Draft; native runtime verification blocked |
| ANA-001..003 | Project brief | Architecture section 6 | Metric fixture, effective-date, permission, suppression tests | Draft |
| MIG-001..003 | Existing mixed records | ERD Migration | Repeatability, validation, transaction rollback, audit tests | Draft |
| NFR-SEC/PRI | Project brief | Architecture sections 5, 8 | Threat review, automated security tests, privacy approval evidence | Draft |
| NFR-AVL/BCK | Unreliable internet | Architecture sections 7, 10 | Internet-disconnected workflow and backup restore exercises | Draft |
| NFR-ACC | UI/UX brief | SRS 5 | Automated checks plus keyboard/screen-reader review | Draft |
| NFR-MNT/DAT | Architecture brief | Architecture sections 3, 6 | Lint/type/schema checks, migration and deletion tests | Draft |
| NFR-LIC | Offline GIS requirement | Architecture sections 7, 9 | Asset inventory, license review, network-call scan | Draft |

During implementation, expand each group to one row per requirement with owner,
acceptance criterion, implementation references, test IDs/results, and approval.
No requirement becomes `Verified` without executed evidence.

2026-11-20 PRO-014 (user approved): Building use categories are implemented in
`buildingUses.ts`, shared housing fields, profiling form/list/details, household
observations and the unmapped directory. Existing values remain Not recorded.
Frontend tests exercise each category's save/reopen flow, occupancy preservation
and filters; backend persistence and browser acceptance remain outstanding.

2026-11-20 PRO-004..009 / NFR-ACC: user approved automatic Family 1 for each
synthetic household and one Water source field in household forms/details.
Initial fixture memberships use Family 1; household creation is idempotent on
edit, and the first additional family brings the count to two. Tests cover these
defaults, explicit family unassignment, new-person context and water-value
preservation. See `HOUSEHOLD_UI.md`; no backend/data migration is included.

2026-11-19 household usability increment (user authorized): PRO-004..008 and
NFR-ACC are implemented in the synthetic preview through household family cards,
explicit person selection, contextual registration and focused member actions.
`model.test.ts` and `components/presentation.test.tsx` cover family/head/history
invariants, two families, transfer, cancellation/removal and registration into a
selected family. Typecheck, production build and all 49 frontend tests pass;
browser/accessibility acceptance and backend persistence remain outstanding.
See `HOUSEHOLD_UI.md`.

2026-11-19 NFR-ACC / NFR-MNT / ANA-002 presentation: user-authorized staff UI
refresh implemented through `professional.css`, navigation and overview markup.
Existing workflow tests, typecheck and production build pass; visual and assistive
technology acceptance remain outstanding. See `UI_REFRESH.md`.


2026-11-19 PRO-002 / ANA-001..002: user-approved age bands implemented in ageGroups.ts, overview, profile/household summaries and filters; 75+ classification pending.

PRO-002 / NFR-ACC (2026-11-19): user authorized duplicate birthdate control removal and typed year; BirthdateInput.test.tsx covers required, leap-date and future-date validation.
2026-11-22 UI makeover increment: the staff overview uses the authorized
database aggregate endpoint for registered people, verified residents,
active households, active housing units, current occupancy, demographics,
and mapped units when GIS is enabled. Family, 4Ps, and audit summaries remain
unavailable until their source workflows and permissions are approved.

2026-11-22 GIS UI increment (GIS-001..008): linked housing-unit map coverage,
directory search and active-status filtering are derived from the existing
database map response; a purok filter remains blocked by absent authoritative
purok data. Existing household-to-map and marker-to-household navigation is
covered by `navigation.test.tsx`.

2026-11-22 Household registry increment (PRO-004..009): database-only household
directory uses server pagination, status/location filters, and links to detail
and GIS. The existing API omits membership/family/head/purok and registry-wide
active/occupancy aggregates; the UI marks these unavailable. Route and pagination
behavior is covered by `navigation.test.tsx` and `api.test.ts`.

2026-11-22 Housing registry increment (PRO-006..007, GIS-005): the Housing
Units route now reads and creates actual HousingUnit records, displays only
fields available in the current API, and summarizes effective HouseholdOccupancy
records with links to available household and map views. Unsupported preview
attributes remain unavailable; occupancy history remains preserved.

2026-11-22 reporting/accountability UI: Reports reads the authorized overview
aggregate and exports aggregate-only CSV; session-memory changes are no longer
presented as the official Activity Log. Audit listing/search, family and 4Ps
counts, and purok summaries still require their source endpoints and approved
definitions.
