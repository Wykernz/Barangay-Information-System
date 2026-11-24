# Profiling API integration contract

Status: partial. Django provides authenticated resident CRUD, verification/photo,
household and housing registries, effective-dated membership/occupancy records,
duplicate-review candidate search, and separate GIS endpoints. The adapter below
remains an unused proposal for versioned history transitions. Use the centralized
Axios client in `frontend/src/api.ts` for new calls.

## Frontend adapter prepared

`frontend/src/features/profiling/api.ts` defines a proposed, not active adapter.
Some resource paths and version fields are not implemented by the current backend;
do not connect screens to it until the remaining contracts are reconciled.
TypeScript declarations are not runtime response validation.

The adapter acquires CSRF before mutations, preserves field errors and rejects
permission/conflict/network failures without sample-data fallback. Archive/restore
is proposed as PATCH `{archived, expected_version}` on a detail endpoint, not DELETE.
Backend must explicitly agree to these semantics and enforce dependency guards.

Wire fields use snake_case. Resident inputs exclude client-generated IDs; list
responses use count/next/previous/results. Transfer returns ended_membership,
created_membership and household_versions. Head selection proposes a paginated
membership response; occupancy change returns ended_occupancy/created_occupancy.
Confirm and reconcile these field names before enabling these proposed UI calls.

Enablement sequence: agree contract → implement permission/transaction-tested
backend endpoints → validate real response schemas → map wire types to frontend
view models → connect query/mutation hooks and cache invalidation → verify complete
workflows against a separate synthetic test database. Do not automatically fall
back to in-memory records when a live save fails. Surveys remain deferred.

Models: Resident (server UUID/reference, structured names, birthdate, approved
demographics), Household, HouseholdMembership (IDs, relationship, effective dates),
head assignment history, HousingUnit, HouseholdOccupancy, HouseholdSurvey
(schema version, observed date, verification state/date/verifier), DuplicateCandidate.
These follow docs/ERD.md. Sensitive health data requires separate permission.

All paths below are proposed under /api/v1/:

| Endpoint | Method | Behavior |
|---|---|---|
| residents/ | GET/POST | Search/paginate and create with server ID |
| residents/{id}/ | GET/PATCH | Authorized general profile |
| residents/{id}/memberships/ | GET | History |
| residents/duplicate-check/ | POST | Implemented: exact name and optional birthdate candidates, manual review only; requires add and view permission |
| households/ | GET/POST | Directory/create |
| households/{id}/ | GET/PATCH | Summary/update attributes |
| households/{id}/memberships/ | GET/POST | Members/assignment |
| memberships/{id}/transfer/ | POST | Atomic end/create membership |
| memberships/{id}/end/ | POST | Effective-dated unassignment |
| households/{id}/head-assignments/ | POST | Eligible head change with history |
| housing-units/ | GET/POST | Unit registry/create |
| housing-units/{id}/ | GET/PATCH | Unit profile |
| households/{id}/occupancies/ | GET/POST | Occupancy history/change |
| households/{id}/surveys/ | GET/POST | Versioned observations |

Example transfer request: `{ "destination_household_id": "uuid",
"effective_date": "2026-11-15", "relationship": "member", "reason": "transfer",
"expected_version": 3 }`. Return ended/new memberships and updated versions.
Failure must leave both households unchanged.

Resident create accepts structured name, birthdate and approved demographic codes;
returns UUID/reference/version and authorized fields. Household details return
head, derived count, member and occupancy links. Lists use count/next/previous/results.
400 supplies field errors; 403 permission denial; 404 missing record; 409 stale or
conflicting operation. Never expose sensitive fields in unauthorized responses.

Server responsibilities: scoped permissions, transactions, FK/date validation,
audit actor/time/reason, concurrency, eligible heads, and manual duplicate review.
Single current membership/head remains a policy decision; the API does not invent
that constraint. Generic membership/occupancy endpoints do not yet provide
transactional transfer, head reassignment, or explicit end actions. Existing
periods accept PATCH of valid_to to close an open segment. Other historical
fields are immutable; closed segments cannot be rewritten or reopened. Period
updates lock the segment within a transaction before validation to prevent
concurrent closure requests from overwriting an already recorded end date.
Head changes must preserve dated history; water/sanitation ownership between
unit attributes and survey observations needs agreement. Coordinates belong to
verified housing-unit locations, not households or residents. No cascade deletion.
