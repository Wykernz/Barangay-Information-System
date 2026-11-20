# Requirements Traceability (Initial Structure)

Status values: Draft, Approved, Implemented, Verified, Deferred.

| Requirement group | Source | Design location | Planned verification | Status |
|---|---|---|---|---|
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


2026-11-19 PRO-002 / ANA-001..002 / NFR-ACC: user-approved age-group and
birthdate utilities are available with boundary, validity and category-filter tests.
UI integration follows in the household and overview increments. See AGE_GROUPS.md.

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

2026-11-20 PRO-004..009 / NFR-ACC: user approved automatic Family 1 for each
synthetic household and one Water source field in household forms/details.
Initial fixture memberships use Family 1; household creation is idempotent on
edit, and the first additional family brings the count to two. Tests cover these
defaults, explicit family unassignment, new-person context and water-value
preservation. See `HOUSEHOLD_UI.md`; no backend/data migration is included.

2026-11-20 PRO-014 (user approved): Building use categories are implemented in
`buildingUses.ts`, shared housing fields, profiling form/list/details, household
observations and the unmapped directory. Existing values remain Not recorded.
Frontend tests exercise each category's save/reopen flow, occupancy preservation
and filters; backend persistence and browser acceptance remain outstanding.
