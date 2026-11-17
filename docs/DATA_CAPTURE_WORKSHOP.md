# Field-capture and workflow workshop

Use this checklist with synthetic examples only. Do not put resident responses,
real coordinates, credentials, or source-record exports in the repository.

## 1. Capture proposed fields, not just column names

Open **Field planner** in the staff workspace. Create one draft per module/version
and add proposed keys for resident, household, housing, survey, or GIS forms.
For every proposed field, record the following in the workshop notes before
activation:

| Question | Why it is needed |
|---|---|
| What is its purpose and data owner? | Prevents collection merely because a field is easy to add. |
| Which staff capability may view/change/export it? | Names alone and UI visibility are not permissions. |
| Is it required, optional, or conditionally required? | Drives API validation and usable forms. |
| What is its type and controlled choice list? | Prevents arbitrary spellings and ambiguous analytics. |
| What is the source and verification method? | Separates reported, observed, imported, and verified facts. |
| Is it sensitive or identifying? | Determines minimization, redaction, and separate access. |
| Is it a current fact or an effective-dated history? | Prevents moves/corrections from erasing provenance. |
| What approved retention/disposal rule applies? | Draft labels do not authorize permanent retention. |

The planner's `sensitive` marker is a technical access-classification proposal,
not legal approval to collect the field. Choice values, required flags, and core
name fields remain provisional until the business/privacy owners approve them.

## 2. Walk through the intended website flow

1. **Sign in:** staff session and server-enforced account permissions.
2. **Field planner:** draft an explicit version, preview fields, save and review
   it, then use **Activate reviewed version** only after the required approvals.
   An active version can be archived without deleting historical records.
3. **Profiling:** after approval, activate a resident version; register/search
   residents, derive age from birthdate, verify data, and flag duplicates for
   human review. The duplicate-resolution workflow is not implemented yet.
4. **Households and housing:** create separate household and housing records,
   then record effective-dated membership and occupancy rather than putting a
   permanent household ID on a resident.
5. **GIS:** record an optional housing point with source, collection method,
   accuracy, CRS, and verification state. Corrections append a location revision.
   Never infer an official boundary from a digitized paper map.
6. **Reports:** define an effective date, metric owner, and small-cell disclosure
   rule before exposing any aggregate. Current demo reports are not authoritative.
7. **Audit and export:** review metadata-only operational events and require a
   separately authorized, audited export workflow. Export is not implemented yet.

The current residents/households/maps navigation outside **Field planner** still
contains synthetic interface previews. Connecting those screens to the new APIs
is a separate vertical-slice task.

## 3. Resolve these blockers before real-data use

- Exact core and extension field dictionary and lawful/privacy review
- Name variants, duplicate-candidate rules, and manual merge policy
- Household definition, head/co-head rules, concurrent memberships, and moves
- Controlled construction, water, sanitation, and survey vocabularies
- Map authority/licensing, target CRS, control points, accuracy, and field method
- Resident verification roles, sensitive-field capabilities, and export rights
- Migration staging, reconciliation, retention, backups, and go-live ownership

See `DECISIONS.md` for the full decision register. Activating a technical form
version does not close these decisions.

## 4. After the workshop

- Keep reviewed decisions and approvers in `DECISIONS.md`.
- Update the ERD and requirements traceability with the accepted terms.
- Create a new form version rather than changing an active version.
- Test required/optional fields, permissions, migration validation, and history
  with synthetic fixtures before accepting real records.
