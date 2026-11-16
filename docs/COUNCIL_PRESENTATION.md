# Council presentation guide

The workspace now uses an operational staff interface without a council/presentation
banner. Registry cards show actual in-session active counts and archived labels.
The footer visibly identifies sample records and expands to explain storage status.
This UI treatment does not change persistence or establish production readiness.

The interface now uses staff-facing language, registry actions, and presentation
wording rather than repeated developer/demo terminology. One clear sample-data
disclosure remains so illustrative figures cannot be mistaken for official records.

## Suggested walkthrough

1. Sign in using the existing staff account.
2. Overview: explain resident, household and housing counts.
3. Resident registry: search, view a profile, and show structured registration.
4. Household registry: open HH-001, explain its head and three members.
5. Demonstrate member links, transfer confirmation and preserved history.
6. Show the housing unit's water/toilet information and occupancy links.
7. Explain GIS readiness: verified geographic data is still required.

## Actual implementation status

Login uses Django sessions and PostgreSQL. Profiling domain records are currently
illustrative and in memory: reload or sign-out loses edits. Backend profiling CRUD,
server authorization, audit persistence and operational migration remain work for
the backend team. Do not describe the presentation as an operational deployment.
Use fictional records only. CSV exports retain an illustrative-data header.

No production data was imported, no API was replaced, and no storage/persistence
behavior changed for presentation. Existing backend contract documentation remains
the integration handoff. Changes are uncommitted pending review.
