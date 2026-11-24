# Requirements and Architecture Decision Register

Statuses: `Confirmed` records supplied constraints; `Proposed` needs approval;
`Open` has no selected outcome. A proposal is not an approved requirement.

## Confirmed constraints

2026-11-22 user requested a phased professional UI/UX makeover. Use the supplied
teal design tokens and reorganize only implemented navigation. Dashboard numbers
must come from authoritative database records; omit unavailable family, 4Ps,
and audit summaries rather than deriving them from session fixtures. Do not add
Relief Operations. Keep the existing stack and routes, and do not push changes
automatically.

2026-11-22 GIS interface increment: search may use existing household and housing
unit references, labels, and house numbers; household-status filters use the stored
active flag. Vacant housing units are absent from the household map directory.
No purok field exists in the database map directory, so
the map must disclose that limitation instead of inferring a purok from names or
approximate positions. Coverage counts represent distinct linked housing units.

2026-11-22 Household Registry UI increment: use the authorized paginated database
map endpoint as the household list source; never merge it with session fixtures.
Only total households and mapped units on the current page are known from that
contract. Active counts, occupancy/member totals, family counts, head, and purok
stay unavailable until an authorized registry API provides them. Search and
filters apply to the loaded server page and disclose that scope.

2026-11-21 user supplied baranggay_admin for the barangay account and Health Center
Admin for the healthcare account name. Use health_center_admin as the compatible
sign-in username and Health Center Admin as its display name. These names do not
authorize a default password, an automatic promotion of a different existing
account, or posting passwords in chat. Account creation must use the local hidden
password prompt and the already approved barangay_admin/healthcare_admin bundles.
The optional --display-name flag sets the account label using Django's existing
first_name field; it does not infer a resident surname. Session responses expose
display_name, falling back to the unchanged username for accounts without a label.

2026-11-21 user supplied the Modern BIMS Person Profile Form image as a layout
reference. Apply a full-page, spacious navy/blue person form with a photo sidebar and
Personal Information, Other Information, Residency Information and Record Status
cards, plus existing assignment controls. Keep current validation, optional
fields, unknown values, generated IDs/registration date and calculated age.
The reference's sample ID/default nationality/required marks are illustrative;
do not infer data or change the approved field contract from image text. Retain
Back/Cancel navigation and provide responsive stacking on small screens. This
full-page correction supersedes the earlier resident modal presentation.

2026-11-21 schema inspection for resident profiling found legacy PostgreSQL
columns absent from migration 0001: nullable residency_classification varchar(20),
is_active boolean NOT NULL, and nullable archived_at timestamp. Preserve these
columns and all values; retain nullable classification for old unknown entries.
Register compatible legacy columns in migration state only after exact metadata
checks; add them normally on fresh databases. Keep is_active/archived_at private
compatibility fields, never infer or rewrite their existing meanings from the new
record-status/archive controls. The migration refuses incompatible definitions
and does not support destructive reversal. No fake migration or data rewrite.
The inspected legacy check constraints require RESIDENT/NON_RESIDENT (or NULL)
and UNVERIFIED/PENDING/VERIFIED/NEEDS_REVIEW stored codes. Preserve those codes;
the serializer exposes readable classification labels and lowercase verification
codes for the existing API. Not recorded classification maps to NULL. Do not
rewrite any stored classifications or verification facts.

2026-11-21 user approved resident profiling fields: generated person ID, first/
middle/last name, suffix, birthdate/calculated age, sex, civil status, nationality,
place of birth, contact number, optional email, residency classification and
status, generated registration date, photo, and record status. Keep immutable
IDs/created_at and derive age, never maintain an age column. New demographic
fields default blank/Not recorded for existing records; no nationality,
registration date, death fact or residency status is inferred. Reuse the existing
classification/civil-status wording; residency choices cover Permanent resident,
Renter, Boarder, Other and Not recorded; record status covers Active, Moved out,
Deceased and Not recorded. These are descriptive entries, not legal findings.
New resident saves in the workspace must persist through the authorized API;
legacy local fixtures retain their IDs and remain explicitly distinguished.
Typed base fields use a system base profile contract only when no custom active
contract is selected; no existing contracts/extension values are overwritten.
Photo policy for this increment: optional JPEG/PNG, at most 5 MiB and 10 million
pixels, re-encoded without EXIF, stored privately with random filenames and
authenticated resident-read access. Replacements preserve old files/revision
references; no automatic retention/deletion period or biometric use is assumed.

2026-11-21 user confirmed Barangay Payahan as the system owner and explicitly
authorized these staff access bundles: healthcare administrator = Health only;
barangay administrator = main barangay workspace plus Health. Health access is
explicitly assigned through these bundles, never inferred from a generic admin
or superuser flag. A health-only group takes precedence if memberships conflict.
Preserve existing health code/data and use a separate non-superuser healthcare
account; do not expose Django account administration to it. Account usernames
await user input; password entry must use a local hidden prompt, never chat,
command arguments, tracked files or default passwords. No unrelated accounts
are automatically promoted. Normal barangay model permissions exclude hard
deletion, health/case bypass and arbitrary account administration. Legacy Health
Workers isolation and Health Administrators explicit access remain supported.

2026-11-20 publication handoff: user explicitly requested committing the GIS,
house-number, hazard-layer, directions, hybrid and online staff-only increment
and pushing it to their fork. Verified destination is
adrianjoseph840-ship-it/Barangay-Information-System, branch feature/adrian-setup;
upstream Wykernz is not the push target. This supersedes the earlier request to
leave these task changes uncommitted. Preserve unrelated health work and keep
all environment values, credentials and local diagnostic files out of Git.

2026-11-20 user approved the recommended hybrid-map implementation. Retain the
existing Leaflet integration; use Esri's supported arcgis/imagery style with its
matching raster labels and source attribution using Esri Leaflet's authenticated
World Imagery layer and Esri's Static Basemap Tiles labels endpoint. An
appropriately entitled browser-scoped ArcGIS Location Platform key is an operator input,
not inferred from public tile accessibility. No credential is committed. Hybrid
becomes the default only when configured; otherwise retain the working street
map and show setup status. Preserve household/hazard/directions layers and leave
changes uncommitted for review. This does not resolve native GIS or schema drift.

2026-11-20 deployment direction supersedes the previous offline/LAN-first target:
user confirmed an online application for authorized staff only. No resident
portal, public registration or anonymous operational-record access is approved.
Serve the staff application over HTTPS through a reverse proxy/managed ingress;
keep application processes, PostgreSQL/PostGIS and private attachments behind
appropriate private network/access boundaries. Online map providers and external
Google Maps directions are permitted subject to licensing. Offline tile support
is optional, not a core acceptance requirement. Localhost remains development
only. Hosting, domain, deployment region, production threat model, privileged
access, monitoring, backup/recovery and rollout require concrete deployment
decisions before go-live. This does not authorize publication of synthetic
scaffolds as production workflows, real resident capture or a deployment now.

2026-11-20 user requested a Google Maps-style Directions action. Add an explicit
external Google Maps directions link for saved, non-rejected house coordinates.
Send only destination latitude/longitude on the staff member's click, with no
resident names, household identifiers, origin tracking or automatic external
request. Google Maps handles starting point, travel mode and routing. No API key,
embedded routing service, offline routing or hazard-aware route claim is assumed.
Absent, invalid or rejected coordinates cannot be used for directions. Keep
unverified points labeled and leave these changes uncommitted for review.

2026-11-20 user requested flood/high-water and fire-prone area colors and clearer
house assignment. Prepare independently selectable, source-backed polygon
overlays with legends and provenance. No flood/fire dataset or classification
thresholds have been supplied or approved; loaded absence means unassessed, not
safe. Static flood susceptibility must not be presented as live water depth.
No inference from imagery, elevation, building materials, or house proximity is
authorized. Accept reviewed source categories as supplied, with an explicit
category-to-color legend. Only public licensed GIS zone files belong in frontend
assets; no household/resident data or private assessments. Original source and
local review status must remain visible. Official boundary approval is separate
from hazard-layer review. User clarified both house-number entry and map pins,
with risk-layer support first and source datasets pending. House numbers are
optional text (up to 50 characters) on the physical HousingUnit, shared by its
occupying households; preserve existing records with a blank default. No
automatic numbering scheme or uniqueness assumption is approved. Existing
server housing-unit change permission controls edits. Number entry does not
verify the house location or imply official address assignment.

2026-11-20 GIS increment authorized by the user: real Payahan map centered at
12.0715, 124.5922, zoom 18; street/satellite layers, sourced boundary, staff
point selection/dragging, database persistence, and bidirectional household links.
Use existing HousingLocation revisions and effective HouseholdOccupancy rather
than duplicating coordinates on households. No existing records are migrated.
Current profiling fixtures are session-only, not canonical database records:
never silently match them by name or create database households from fixtures.
Expose database household details alongside the preview, with explicit labels.
Map selection records an unverified location, never automatic verification.
Boundary provenance, version, licence and indicative/official status must be
visible; no fabricated fallback polygon. Official sign-off remains OPN-008.
Provider credentials/paid entitlements and licensed offline assets are operator
inputs; public OSM tiles must never be bulk downloaded or service-worker cached.
Keep GIS native dependency gate; a disabled GIS backend must report unavailability
and never claim that browser-only edits were saved. Real resident capture remains
outside this synthetic development increment.

2026-11-20 user approved Building use choices for physical building/housing-unit
records: Residential, Commercial, Mixed-Use, Institutional and Other, with the
examples supplied in the request. Unknown existing values remain Not recorded;
household occupancy does not infer a category. Add capture, display and filters
in the synthetic frontend. This is descriptive use, not official zoning, permits
or legal classification. Backend persistence and schema remain a later increment.

2026-11-20 user supplied replacement demo names. Treat these as sample display
aliases only, without attributing real demographic facts to anyone. Preserve the
first six synthetic profiles' IDs and fictional attributes; add the seventh as
an unassigned sample with demographic values not recorded. Update household-head
labels consistently, without inferring new family relationships or real data.

2026-11-20 user requested one automatic family per household: seed each synthetic
household with Family 1 and its current members; creating a household creates
Family 1, so the first added family brings the count to two. Preserve explicit
family changes and historical membership segments. Household water capture and
display use one Water source field (existing synthetic waterSupply value); remove
the duplicate housing-water row from household details. Housing units retain
their independent attributes. No production data or migrations are involved.

2026-11-19 household usability increment: user requested clearer family creation
and member management, including a second family and its members. Keep families
within one household; a person has at most one current family there. Use family
cards, explicit member selection, a searchable member list and focused dialogs.
Offer existing-person assignment and new-person registration with household/family
context. Reassignment retains membership history and household-head status; no
family head is inferred. This remains the authorized synthetic session preview.

Family grouping increment: user authorized families within a household. Groups
have an internal ID, household ID and staff-entered label. A current household
member may be unassigned or belong to one family group in that household;
reassignment supersedes the membership segment to retain history. No family
head is inferred. This increment remains a synthetic session preview.

2026-11-17 household simplification: remove municipality, barangay and interviewer
from manual household entry/display. Septic tank is a separate Yes/None/Not
recorded observation; no automatic conversion from previous toilet categories.
Multiple families within a household: proposed family-group child entity with
dated person memberships. Household and physical housing unit remain separate;
family heads would not replace the household head. Implementation pending.

2026-11-17 scope update: Field Planner, Office Services and Staff & Access are
removed from active workspace navigation and routes at the user's request.
Backend form definitions, authentication, health-role controls and dormant source
remain intact. This does not remove real accounts or their permissions.

2026-11-17 scope update: user deferred appointments and complaints to focus on
profiling. Remove their active routes, navigation, overview and report metrics.
Retain dormant fixtures and historical requirements; no operational data deletion.

2026-11-17 user requested optional LGBT identification, PWD status and overview
counts. Synthetic preview uses separate voluntary identification and sex fields;
blank/declined answers remain unknown. Health and complaint counts cannot be
inferred from fixture names or treated as zero when unavailable. Production
identity/disability collection and aggregate visibility require explicit access
controls. Complaint counts mean cases filed by the person, not accusations.

Health assessment increment: store dated, append-only observations linked to a
canonical person. Pregnancy, family planning and screening use optional staff
notes until exact paper-form categories are supplied; blank means not recorded,
never a negative finding. Explicit health groups alone authorize this API.
No clinical diagnosis or eligibility is inferred. No migration is applied here.

2026-11-17 user access decision: admin and designated health-worker accounts may
access health information. Health-worker accounts may access only health services.
The explicit `Health Workers` Django group activates backend isolation; membership
must not be assigned to ordinary admin accounts. No existing accounts were changed.
Health capture and explicit admin/health read-write permissions remain to implement.

2026-11-17 requested capture extension: residency classification, household survey
header, demographics, water and sanitation. Current restored profile UI uses
session-only synthetic records. Health symptoms, pregnancy categories, family
planning, NHTS identifiers and insurance details require explicit sensitive-data
permissions and agreed field definitions before operational capture. Age and
senior status must be derived from birthdate, never maintained separately.

| ID | Status | Decision/constraint | Consequence |
|---|---|---|---|
| DEC-001 | Confirmed | Deployment serves one barangay. | No premature multi-tenant design. |
| DEC-002 | Confirmed | Authorized office personnel register residents. | No self-registration workflow. |
| DEC-003 | Confirmed | Source records are mixed paper and digital. | Staging, provenance, reconciliation, and manual QA are required. |
| DEC-004 | Superseded 2026-11-20 | Earlier offline/LAN-first requirement replaced by user-confirmed online, authorized-staff-only use. | HTTPS-hosted staff app; offline assets optional; production hosting/security decisions remain open. |
| DEC-005 | Confirmed | Existing GIS source is a paper map. | Scan/georeference/digitize/validate workflow; no invented geometry. |
| DEC-006 | Confirmed | Public resident/appointment access is not decided. | Staff-only boundary until a later approved architecture. |
| DEC-007 | Confirmed | Modular monolith with Django/DRF/GeoDjango, React/TypeScript, and PostgreSQL/PostGIS. | Domain modules share one deployable system and authoritative database. |

## Proposed architecture decisions

| ID | Status | Proposal | Rationale / approval needed |
|---|---|---|---|
| DEC-010 | Proposed | Same-origin session authentication for the online staff web app. | Preserve Django CSRF/session support and secure production cookies; review deployment security. |
| DEC-011 | Proposed | UUID internal identifiers and separate non-PII human references. | Reduces enumeration/PII leakage; confirm operational usability. |
| DEC-012 | Superseded 2026-11-20 | Earlier mandatory on-premises/offline topology replaced by online staff-only deployment. | Select hosting, HTTPS ingress, private DB/storage and backup/recovery before go-live. |
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


2026-11-19 user authorized removing the missing-birthdate indicator from Overview and simplifying birthday entry. Keep birthdate mandatory; provide direct month/day/year entry without changing stored dates or backend rules.

2026-11-19 user approved mutually exclusive age groups: Early Childhood (0–5 years); Children (6–12 years); Teenagers / Adolescents (13–17 years); Young Adults (18–24 years); Adults (25–34 years); Middle Adults (35–44 years); Older Adults (45–59 years); Senior Citizens (60–74 years). Ages 75+ await a user-supplied classification. Derive completed years from birthdate at the reporting date; separate senior status remains 60+. Synthetic preview only (PRO-002, ANA-001..002); no schema change.

2026-11-19 user requested a single birthdate control with directly editable year. Remove the duplicate native date picker; retain month/day selectors and a four-digit typed year with required, calendar and future-date validation. No stored dates or schema changes (PRO-002, NFR-ACC).

2026-11-19 user authorized a professional UI/UX refresh of the existing staff interface (NFR-ACC / NFR-MNT). Use a consistent slate/teal palette, local system fonts, icon navigation with text labels, responsive summary cards and readable tables/forms. Preserve existing routes, validation, permissions and synthetic-data boundaries. No external assets or new runtime dependencies; visual choices are reversible implementation details.

2026-11-22 Housing Units UI increment (PRO-006, PRO-007, GIS-005): use the
existing HousingUnit and HouseholdOccupancy endpoints for the directory,
creation form, and current assignment summary. Display only label, generated
reference, house number, address, active status, and effective occupancy that
the existing API stores. Materials, utilities, building classification, and
other preview-only attributes remain unavailable until approved and modeled.
No deletion or history rewrite is introduced.

2026-11-22 reporting and accountability UI: Reports now uses the existing
authorized database overview aggregate and offers only aggregate CSV export.
Activity Log reads a new read-only projection of server audit events. Only
Barangay Administrators receive its view permission; metadata is excluded.
Family, 4Ps, and purok analytics remain unavailable until source APIs and
approved definitions are established.

2026-11-22 community-record UI continuation: the routed Residents directory
shows database records only; session-only sample profiles remain available to
isolated preview components/tests but are excluded from the staff registry.
Household creation uses the existing Household endpoint and leaves membership,
family, and occupancy assignment as separate workflows. Families, Social
Assistance, and Barangay Forms routes are setup-status scaffolds only because
their authoritative domain records/templates and required approvals are absent.
Database resident detail tabs read household membership and audit history only
through their protected APIs; family details remain unavailable and health
details stay inside the separately authorized Health workspace.

2026-11-23 resident entry usability correction (PRO-001..003): require only
first name and surname, plus birthdate for a new profile because age and age
groups are derived from it. Existing records with no recorded birthdate remain
editable. Classification, sex, civil status, contact details, nationality,
residency status, photo, and other descriptive fields may remain blank or Not
recorded; never block saving solely because one is unknown. Explain overview
API failures by authentication, authorization, network, or server status so
staff can identify the next step. No change to server authorization or stored
record semantics.
# Household history safeguard (2026-11-23)

Under PRO-006, existing membership and occupancy segments retain their original
participants, relationship, head flag, and start date. PATCH may close an open
segment by supplying valid_to; it may not rewrite or reopen a closed segment.
Changes to participants or head status require a new dated segment. This does
not impose a single-membership or single-head policy; those decisions remain open.

## Household assignment workflow (2026-11-24)

User approved persistent database workflows for assigning and transferring a
resident between households and for moving a household between physical housing
units. Approved workflow actions allow one open household-membership segment per
resident and one open housing-occupancy segment per household. A transfer or move
uses an inclusive effective period: the previous segment ends on the day before
the new segment starts. The transaction must either close and create both records
or change neither. Generic membership and occupancy creation is disabled so staff
cannot bypass these transitions. Existing legacy conflicts are not rewritten;
multiple open occupancy records require administrative review. Household-head and
co-head eligibility and replacement rules remain unresolved under OPN-006, so
this increment does not provide a dedicated head-change workflow.

## Overview analytics increment (2026-11-24)

User approved database-backed analytics on the staff Overview under ANA-001..003.
Use the previously approved age bands and label ages 75+ as classification
pending rather than inventing a final category. Household-size bands are 0, 1,
2-3, 4-5, and 6+ current members as of the reporting date. Water and sanitation
use the stored controlled-vocabulary labels and count missing values explicitly.
Data-quality indicators show missing birthdates, verification/classification
backlogs, missing household water/sanitation values, and housing units without a
current occupancy. These are authorized operational aggregates, not legal,
health, hazard, or beneficiary determinations. Record-level drill-down and
sensitive small-cell publication remain outside this increment.

## Printable field-definition forms (2026-11-24)

User requested that forms open and print individually. The Forms route may render
each existing authorized profile-form definition as a separate blank A4
data-collection sheet and invoke the browser print dialog for that sheet. Field
labels, help text, order, choices, required flags, and sensitive-handling labels
come from the stored definition; the UI must not invent certificate wording.
Draft and archived versions remain visibly watermarked. These sheets are not
issued barangay certificates, clearances, legal instruments, or issuance records.
Official document templates, signatories, numbering, fees, issuance history, and
authorization rules remain pending explicit approval.
