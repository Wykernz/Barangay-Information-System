# Proposed profiling integration contract

Status: coordination draft for the backend developer. Current backend routes are
authentication/session/schema only. No profiling API is called or implemented.
Future integration must reuse the centralized Axios client in frontend/src/api.ts.

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
| residents/duplicate-check/ | POST | Manual review candidates; no auto-merge |
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
Single current membership/head is a demo assumption pending policy approval.
Head changes must preserve dated history; water/sanitation ownership between
unit attributes and survey observations needs agreement. Coordinates belong to
verified housing-unit locations, not households or residents. No cascade deletion.
