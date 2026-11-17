# Requirements and Architecture Decision Register

Statuses: `Confirmed` records supplied constraints; `Proposed` needs approval;
`Open` has no selected outcome. A proposal is not an approved requirement.

## Confirmed constraints

| ID | Status | Decision/constraint | Consequence |
|---|---|---|---|
| DEC-001 | Confirmed | Deployment serves one barangay. | No premature multi-tenant design. |
| DEC-002 | Confirmed | Authorized office personnel register residents. | No self-registration workflow. |
| DEC-003 | Confirmed | Source records are mixed paper and digital. | Staging, provenance, reconciliation, and manual QA are required. |
| DEC-004 | Confirmed | Internet can be unreliable or absent. | Core runtime and assets must operate on the LAN. |
| DEC-005 | Confirmed | Existing GIS source is a paper map. | Scan/georeference/digitize/validate workflow; no invented geometry. |
| DEC-006 | Confirmed | Public resident/appointment access is not decided. | Staff-only boundary until a later approved architecture. |
| DEC-007 | Confirmed | Modular monolith with Django/DRF/GeoDjango, React/TypeScript, and PostgreSQL/PostGIS. | Domain modules share one deployable system and authoritative database. |

## Proposed architecture decisions

| ID | Status | Proposal | Rationale / approval needed |
|---|---|---|---|
| DEC-010 | Proposed | Same-origin session authentication for the LAN staff web app. | Strong Django CSRF/session support; approve with security owner. |
| DEC-011 | Proposed | UUID internal identifiers and separate non-PII human references. | Reduces enumeration/PII leakage; confirm operational usability. |
| DEC-012 | Proposed | Dedicated on-premises server, reverse proxy, UPS, private DB/storage, encrypted backup workflow. | Practical offline topology; choose OS/container strategy after discovery. |
| DEC-013 | Proposed | QGIS produces reviewed GeoJSON for staged import; it does not edit production directly. | Preserves review, validation, and audit controls. |
| DEC-014 | Proposed | Capability permissions plus scoped querysets/object policy; roles are bundles only. | Prevents over-broad administrator access. |
| DEC-015 | Proposed | Effective-dated append-oriented history and protect/restrict deletion defaults. | Preserves accountability and historical reporting. |
| DEC-016 | Proposed | Before the field-capture workshop, use versioned draft form definitions and explicit typed fields for proposed additions. Activate forms before resident use; do not treat draft fields as approved policy. | Supports changing workshop results without uncontrolled columns or an EAV model. Active forms are immutable; new requirements receive a new version. |
| DEC-017 | Proposed | Keep GeoDjango behind `DJANGO_ENABLE_GIS` until PostGIS, GDAL, and GEOS are verified on the host. Core draft profiling remains available without spatial support. | Prevents a missing native GIS dependency from blocking field planning; production GIS still requires PostGIS and the complete GIS checks. |

## Open stakeholder decisions

| ID | Owner needed | Decision required | Why it blocks/affects work |
|---|---|---|---|
| OPN-001 | Executive/product owner | Named approvers, module priorities, pilot scope, go-live criteria, budget/timeline | Establishes authority and acceptance. |
| OPN-002 | Privacy/legal lead | Processing purposes/lawful basis, privacy notices, data-sharing, PIA owner, incident reporting | Controls what may lawfully be collected and used. |
| OPN-003 | Privacy/records/legal | Field-level retention, archival, disposal, legal holds, and backup expiry | Prevents unsafe permanent retention or deletion. |
| OPN-004 | Business owner | Exact resident fields, valid values, verification rules, identifiers, and update authority | Needed for data dictionary and forms. |
| OPN-005 | Business/privacy | Filipino name handling, aliases, duplicate matching fields/thresholds, manual resolution and correction policy | Needed for safe deduplication without auto-merge. |
| OPN-006 | Business owner | Household definition, concurrent memberships, head/co-head rules, split/merge/move semantics | Needed for constraints and accurate counts. |
| OPN-007 | Health/privacy lead | Allowed health/support declarations, purpose, visibility, consent/authority, sharing and retention | Blocks sensitive health implementation. |
| OPN-008 | GIS/data owner | Authority/licensing of paper map, target CRS, control points, acceptable accuracy, verification/sign-off | Blocks official spatial data import. |
| OPN-009 | GIS/operations | House-coordinate collection method, devices, consent/notice, accuracy capture, correction process | Blocks production house mapping. |
| OPN-010 | IT/product | Hardware, server OS, native vs containers, UPS, LAN topology, clients, concurrent users, record volume | Needed for deployment and performance targets. |
| OPN-011 | Security/operations | Account provisioning, MFA feasibility, session duration, password policy, privileged/break-glass access | Needed for authentication configuration. |
| OPN-012 | Business owner | Role membership and field/action-level permission matrix including export and audit review | Needed for authorization acceptance. |
| OPN-013 | Appointment owner | Services, hours/exceptions, slot/resource/capacity semantics, transition rules, notification method | Blocks conflict logic and workflow. |
| OPN-014 | Legal/case owner | Complaint categories, jurisdiction, mandated workflow/deadlines, party access, referrals, closure/reopening | Blocks production case workflow. |
| OPN-015 | Security/legal | Attachment types/sizes, malware scanning, evidence handling, chain-of-custody expectations | Needed for safe case files. |
| OPN-016 | Product/privacy | Public portal/booking decision and identity proofing; remote access decision | Would require separate threat model and boundary. |
| OPN-017 | Data owners | Metric definitions, effective dates, age bands, small-cell suppression, export formats | Needed for trustworthy analytics. |
| OPN-018 | Operations | Availability target, RPO/RTO, backup destinations/custodians, restore frequency, off-site process | Needed for continuity design. |
| OPN-019 | Migration owner | Source inventory, data quality baseline, reconciliation/sign-off, cutover and paper-record handling | Needed for safe migration. |
| OPN-020 | Accessibility/training owner | Languages, literacy/accessibility needs, training and support model | Affects UI content and acceptance. |
| OPN-021 | Procurement/legal | License/attribution approval for local tiles, map data, fonts, and dependencies | Prevents unlicensed offline assets. |

## Decision process

### Foundation development authorization

The user authorized project building after the planning handoff, followed by
continued foundation work and documented commits/pushes. This authorizes local
scaffolding, synthetic development setup, and verification. It does not resolve
the outstanding operational, legal/privacy, public-access, or GIS decisions.

Local development uses a separate loopback PostgreSQL cluster on port 55432 to
avoid changing existing system databases. Its administrator role and debug
configuration are development-only choices, not production architecture approval.

Each resolved item records decision date, accountable approver, chosen option,
rationale, consequences, and superseded decision. High-risk privacy, legal, GIS,
and security decisions require their specialist owner, not only the software team.

