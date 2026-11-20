# Software Requirements Specification (Phase 1 Draft)

Status: **Draft for stakeholder review**  
System: Barangay Information Management System (BIMS)  
Scope: One barangay in the Philippines

## 1. Purpose

BIMS will support authorized barangay personnel in maintaining resident,
household, housing, appointment, complaint, GIS, and operational analytics data.
It is intended for actual office operations on a local network where internet
service may be unreliable or absent.

This draft separates confirmed needs from proposals and open decisions. It is
not an assertion of legal compliance or production readiness.

## 2. Stakeholders

- Barangay officials and system owner
- Barangay secretary and administrative personnel
- Profiling and migration staff
- Barangay health workers
- Appointment and complaint officers
- Data protection/privacy lead
- IT administrator and backup custodian
- Residents whose information is processed
- Legal and records-management reviewers

Named owners, approvers, and escalation contacts remain to be assigned.

## 3. Scope

### 3.1 Confirmed in scope

- Staff-created and staff-maintained resident records
- Distinct resident, household, and housing-unit records
- Household membership history and household-head assignment
- Housing, water, sanitation, survey, verification, and restricted support data
- Staff-managed appointments with capacity and status history
- Restricted complaints/cases with evidence, activity, and accountability history
- GIS layers and housing-unit locations, including unmapped/unverified states
- Dashboards derived from consistent authoritative definitions
- Centralized staff roles, permissions, audit logs, and protected exports
- Paper/digital data migration staging and quality review
- LAN deployment that can operate without internet

### 3.2 Explicitly out of scope until approved

- Public resident portal or self-registration
- Public appointment booking
- Payment processing
- Internet exposure of the local server or database
- Invented mediation rules, legal deadlines, jurisdiction rules, retention periods,
  official boundaries, or real coordinates
- A PWA as a substitute for an available local application server

## 4. Functional requirements

Identifiers are stable traceability keys. Priority is MoSCoW for the intended
system, not permission to implement before phase approval.

### 4.1 Identity, access, and accountability

| ID | Requirement | Priority |
|---|---|---|
| IAM-001 | The system shall use a custom staff user model from the first migration. | Must |
| IAM-002 | The system shall authenticate staff with secure sessions and CSRF protection. | Must |
| IAM-003 | The server shall enforce centralized role and object/domain permissions. | Must |
| IAM-004 | Sensitive health and complaint access shall require explicit permission independent of generic administration. | Must |
| IAM-005 | Authorized staff shall deactivate accounts without deleting accountability history. | Must |
| IAM-006 | The system shall audit security-relevant access and changes with actor and timestamp. | Must |
| IAM-007 | The system shall apply session expiration, login throttling, password policy, and privileged-account protections. | Must |
| IAM-008 | Exports shall require explicit authorization and create an audit event. | Must |

### 4.2 Resident, household, housing, and survey profiling

| ID | Requirement | Priority |
|---|---|---|
| PRO-001 | Authorized staff shall create, view, update, search, and verify resident records. | Must |
| PRO-002 | Resident identity shall include birthdate and calculate age dynamically for an effective date. | Must |
| PRO-003 | The system shall track demographic, contact, and residency status fields subject to approved minimization. | Must |
| PRO-004 | The system shall maintain households separately from physical housing units. | Must |
| PRO-005 | A housing unit shall support zero, one, or multiple households. | Must |
| PRO-006 | Household membership shall preserve effective dates, relationships, and history. | Must |
| PRO-007 | Household head assignment shall be validated and historically traceable. | Must |
| PRO-008 | Active household member count shall be derived from membership records. | Must |
| PRO-009 | Housing construction, water source, toilet availability, and sanitation classifications shall use controlled vocabularies. | Must |
| PRO-010 | Surveys shall preserve survey type/version, observation date, verifier, verification date, and status. | Must |
| PRO-011 | Health declarations and support needs shall be restricted and minimized. | Must |
| PRO-012 | Duplicate detection shall flag candidates for human review and shall never merge automatically. | Must |
| PRO-013 | Authorized users shall generate approved reports and exports. | Should |
| PRO-014 | Physical building/housing-unit records shall support staff-selected Building use: Residential, Commercial, Mixed-Use, Institutional or Other; unknown values remain Not recorded without inference from occupancy. User approved 2026-11-20; current implementation is a synthetic frontend preview. | Must |

### 4.3 Appointments

| ID | Requirement | Priority |
|---|---|---|
| APT-001 | Authorized staff shall configure services, operating hours, closures, duration/capacity rules, and active state. | Must |
| APT-002 | Staff shall schedule, approve, reject, reschedule, cancel, complete, and mark no-show appointments. | Must |
| APT-003 | The system shall prevent conflicts according to the approved capacity model in a transaction. | Must |
| APT-004 | Each appointment shall have a unique non-sensitive reference number. | Must |
| APT-005 | Every status transition shall preserve actor, time, previous/new status, and reason where applicable. | Must |
| APT-006 | Appointment access shall be staff-only until a public-channel decision is approved. | Must |

### 4.4 Complaints and cases

| ID | Requirement | Priority |
|---|---|---|
| CAS-001 | Authorized officers shall register complaints with a unique reference, category, parties where applicable, and incident details. | Must |
| CAS-002 | Authorized officers shall assign cases and record append-only activities and status changes. | Must |
| CAS-003 | The system shall support resolution, withdrawal, referral, and closure states without inventing legal procedure. | Must |
| CAS-004 | Evidence attachments shall be private, validated, access-controlled, and audited. | Must |
| CAS-005 | Case data shall be omitted from responses unless the requesting user has explicit case access. | Must |
| CAS-006 | Workflow, deadlines, jurisdiction, and retention shall remain configurable/pending legal approval. | Must |

### 4.5 GIS

| ID | Requirement | Priority |
|---|---|---|
| GIS-001 | The system shall store approved boundary and subdivision layers when verified data exists. | Must |
| GIS-002 | Housing units may remain unmapped; mapped locations shall include source, accuracy, verification state, and verifier. | Must |
| GIS-003 | Authorized users shall link map markers to housing units and their accessible household records. | Must |
| GIS-004 | Location corrections shall preserve history rather than overwrite provenance. | Must |
| GIS-005 | Authorized maps shall filter approved housing, water, and sanitation classifications. | Should |
| GIS-006 | Geographic statistics shall be aggregated and respect access/small-cell disclosure rules. | Must |
| GIS-007 | Runtime maps shall work using locally hosted, licensed resources without internet. | Must |
| GIS-008 | Development geographic data shall be clearly labeled synthetic and shall not imply official accuracy. | Must |

### 4.6 Analytics and data quality

| ID | Requirement | Priority |
|---|---|---|
| ANA-001 | Dashboard metrics shall use documented definitions and a consistent reporting effective date. | Must |
| ANA-002 | Authorized dashboards shall cover resident, household, housing, appointment, complaint, and geographic summaries. | Must |
| ANA-003 | Dashboards shall expose missing, stale, and unverified-data indicators. | Must |
| MIG-001 | Migration shall stage source rows separately from canonical records and preserve source provenance. | Must |
| MIG-002 | Migration shall record validation, duplicate candidates, reconciliation state, and responsible reviewer. | Must |
| MIG-003 | Import into canonical records shall be repeatable, transactional, and auditable. | Must |

## 5. Non-functional requirements

| ID | Requirement |
|---|---|
| NFR-SEC-001 | Default-deny authorization, least privilege, server-side validation, safe uploads, protected secrets, and dependency/security review shall be used. |
| NFR-PRI-001 | The project shall support data minimization, purpose/lawful-basis review, privacy notices, access logs, retention/disposal planning, incident response, and PIA preparation; privacy/legal owners must approve them. |
| NFR-AVL-001 | Staff workflows shall function on the barangay LAN without internet; recovery objectives and availability target remain open. |
| NFR-PER-001 | Performance targets shall be established after device, concurrency, and record-volume discovery. |
| NFR-ACC-001 | Staff UI shall target WCAG 2.2 AA with keyboard access, programmatic labels, visible focus, and understandable errors. |
| NFR-MNT-001 | The system shall use modular boundaries, migrations, automated tests, versioned APIs, structured logs, and documented operations. |
| NFR-BCK-001 | Backups shall be encrypted, access-controlled, tested by restoration, and governed by approved retention and off-site strategy. |
| NFR-DAT-001 | Important historical records shall not be removed through unrestricted cascade deletion. |
| NFR-LIC-001 | All locally served map/data/software assets shall have recorded, compatible licensing and attribution. |

## 6. External interfaces

- Browser UI served on the local network over HTTPS where feasible
- Versioned JSON REST API under `/api/v1/`
- PostgreSQL/PostGIS reachable only by the application/administration boundary
- Controlled file storage outside public static paths
- GeoJSON import/export for authorized geographic exchange
- QGIS is an external preparation/validation tool, not a direct production editor

## 7. Data rules

- Every canonical record uses an internal immutable identifier; display/reference
  numbers must not encode sensitive data.
- Operational records include creation/update timestamps and accountable actors.
- Effective-dated records use explicit non-overlap/integrity rules where possible.
- Deletion behavior is restrict/protect, archival, or approved soft deletion based
  on the retention schedule; it is not an unrestricted cascade.
- Enumerations that change operationally are controlled reference data, not
  arbitrary UI strings.

## 8. Acceptance approach

Acceptance is traceable in `REQUIREMENTS_TRACEABILITY.md`. Evidence will include
unit, API, constraint, permission, frontend, end-to-end, backup restoration, and
LAN-without-internet tests. No phase is production-ready merely because code or
documentation exists.

## 9. Assumptions and dependencies

- The barangay will designate product, privacy, records, legal, and technical owners.
- The paper map can be lawfully scanned and validated, but its authority is not assumed.
- Hardware, UPS, network topology, client devices, concurrency, and data volumes
  require discovery before deployment sizing.
- PostgreSQL/PostGIS, Python, QGIS, and a deployment/container approach must be
  installed or selected during Project Foundation.

## 10. Approval gates

1. Stakeholders approve scope, terminology, roles, and high-risk open decisions.
2. Privacy/legal owners approve sensitive fields, access, notices, retention, and case rules.
3. Technical owner approves architecture, deployment, backup, and GIS provenance plan.
4. Only then begin the major Project Foundation implementation.

