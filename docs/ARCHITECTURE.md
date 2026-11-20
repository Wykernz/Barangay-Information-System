# Preliminary Architecture Proposal

Status: **Proposed; approval required before major implementation**

## 1. Context and constraints

BIMS serves one barangay through an online application for authorized staff only
(user confirmed 2026-11-20). PostgreSQL/PostGIS is authoritative and private.
There is no approved resident portal. Offline operation is optional; hosting,
production security review and house-coordinate collection decisions remain open.

Verified workspace/tool snapshot on 2026-11-14:

| Item | Observed state |
|---|---|
| Repository | Only `README.md`; branch `feature/adrian-setup` |
| Git | 2.55.0.windows.2 |
| Node.js | v24.18.0 |
| npm | Present, but PowerShell blocks `npm.ps1`; use `npm.cmd` or approve policy change |
| Python | Launcher present but no Python runtime installed |
| PostgreSQL client | Located under PostgreSQL 18; version verification still required |
| Docker | Not found |
| QGIS | Not found on PATH |
| VS Code | Installed |

This inventory reflects command discovery, not an approved production stack.

## 2. System shape

```text
Authorized staff browsers over the internet
          |
     HTTPS/reverse proxy
          |
  +-------+-------------------+
  | BIMS modular monolith     |
  | React static application  |
  | Django/DRF API /api/v1/   |
  | Domain services + jobs    |
  +-------+-----------+-------+
          |           |
 PostgreSQL/PostGIS   Private attachment storage
          |
 Encrypted local + approved off-site backups

QGIS -> reviewed GeoJSON/staging import -> BIMS (not live production editing)
```

Application assets are bundled with the deployment. Licensed online map services
may be used; locally hosted tiles remain optional. The database binds to a
private interface/network and is never exposed to the public internet.

### Pre-capture extensibility increment

The synthetic foundation now includes versioned `FormDefinition`/`FormField`
records for proposed resident, household, housing, survey, and GIS fields. Drafts
are editable, active versions are immutable, and only new versions can change an
active contract. Residents accept extension values only from an active resident
form; values are validated against the stored types and choices. Fields marked
sensitive require separate read and write capabilities, and resident writes save
an append-oriented revision. These mechanisms do not approve a field, lawful
basis, vocabulary, or retention rule.

Residents, households, housing units, effective-dated memberships/occupancies,
and housing-location revisions use UUID internal keys and non-PII references.
Domain writes produce metadata-only audit events; resident values and coordinates
are not copied into the audit event payload. Resident revision snapshots do
contain profile data and therefore require strict restricted access in a later
review/export interface.

`DJANGO_ENABLE_GIS=true` selects GeoDjango/PostGIS and the housing-location
endpoints. It must remain false until host GDAL/GEOS libraries and the PostGIS
extension are verified. This is only a development readiness gate, not a fallback
that treats nonspatial storage as GIS.

## 3. Modular monolith boundaries

| Django app | Responsibility |
|---|---|
| `accounts` | Custom user, role/permission policy, sessions, account lifecycle |
| `audit` | Append-oriented security and business audit events |
| `profiling` | Residents, identity, verification, duplicate candidates |
| `households` | Households, housing units, memberships, surveys/classifications |
| `health` | Restricted declarations and support needs (separate authorization) |
| `gis` | Boundaries, verified locations, correction history, spatial queries |
| `appointments` | Services, schedules, capacity, appointments, status history |
| `cases` | Complaints, assignments, activities, evidence, restricted workflows |
| `analytics` | Defined aggregate queries/read models; no duplicate source of truth |
| `migration` | Staging, provenance, validation, reconciliation, import batches |
| `common` | Narrow shared primitives; not a dumping ground for domain logic |

Cross-domain changes use application services and database transactions. Views
handle transport concerns, serializers validate representations, services own
workflows, and models/constraints protect invariants. Domain apps must not query
restricted tables merely for UI convenience.

## 4. API conventions

- Root: `/api/v1/`; JSON with UTF-8; OpenAPI generated and validated.
- Session authentication for the same-origin staff UI; mutating requests require CSRF.
- Default deny permissions at endpoint and object/queryset level.
- List endpoints use pagination, allowlisted ordering/filtering, and bounded search.
- Errors use a stable envelope with code, message, field errors, and correlation ID.
- Dates are ISO 8601; instants are timezone-aware and stored in UTC; barangay display
  uses `Asia/Manila`. Date-only civil facts such as birthdates remain dates.
- Optimistic concurrency (`updated_at`/version or ETag) should protect high-conflict edits.
- Reference numbers are unique, non-sequential where practical, and contain no PII.
- Responses serialize only authorized fields; redaction in the browser is insufficient.

## 5. Authorization model

Roles are job-function bundles, not the source of truth. Permissions are named
capabilities (for example `profiling.view_resident`, `health.view_declaration`,
`cases.view_restricted_case`, `exports.export_resident_data`). Querysets are
scoped before serialization. Case assignment and sensitivity may add object-level
policy. Break-glass access, if approved, requires a reason, short duration,
notification, and prominent audit review.

The detailed proposed matrix belongs in `ROLE_PERMISSION_MATRIX.md` during the
architecture approval pass; role labels alone must not grant sensitive access.

## 6. Data and integrity

- UUID/internal keys plus separate human reference numbers.
- PostgreSQL constraints for uniqueness, valid time ranges, and compatible states.
- PostGIS `Point` locations use an approved SRID; retain original/source CRS metadata
  during import. Add GiST spatial indexes only to verified geometry columns queried.
- Historical tables are append-oriented/effective-dated. Corrections add superseding
  records or explicit audit history rather than silently erasing provenance.
- Attachments store metadata in PostgreSQL and bytes in private storage, with random
  server-side names, MIME/signature inspection, size limits, hashes, and malware
  scanning strategy. Downloads pass authorization and audit checks.
- Analytics query canonical tables using versioned metric definitions and effective dates.

## 7. Online staff deployment

The target is an HTTPS staff application behind managed ingress or a reverse
proxy, with private application processes, PostgreSQL/PostGIS and attachment
storage. Select hosting, domain, deployment region, operating environment,
monitoring, backups and recovery procedures before rollout. Current localhost
commands remain for development and are not a production deployment.

Internet staff access is authorized in scope; production requires a corresponding
threat model and verified access controls. Do not expose Django's development
server or PostgreSQL directly. Privileged remote administration needs a separately
controlled channel with appropriate authentication and logging.

## 8. Security and privacy architecture

- Environment-provided secrets, encrypted backups, least-privilege service accounts.
- HTTPS using valid production certificates; secure, HttpOnly,
  SameSite cookies; CSRF; CSP and other response headers.
- Rate-limit authentication and costly/export endpoints; alert on abuse patterns.
- Structured logs exclude sensitive payloads and use correlation IDs.
- Audit reads/exports of sensitive records as well as modifications.
- Separate privacy/legal approval is required for field collection, processing
  purpose/lawful basis, notices, sharing, retention, disposal, and incident response.

## 9. GIS workflow

The authorized Payahan map increment is documented in [GIS.md](GIS.md).
Leaflet renders licensed real tile layers and an unchanged, provenance-bearing
HDX polygon labeled indicative. The user-supplied initial center is preserved
even though it lies outside the published polygon extent. Household links use
effective occupancies and existing PostGIS point revisions; the frontend keeps
database household locations explicitly separate from session-only profile
fixtures. Local licensed XYZ files can be served over the LAN. GIS saves remain
gated on verified native dependencies; online providers are optional basemaps,
not dependencies of local household storage.

1. Inventory paper map provenance, scale, date, authority, condition, and usage rights.
2. Scan at an archival quality and preserve the untouched master plus checksum.
3. Obtain approved control points from an authoritative source; select CRS with a GIS reviewer.
4. Georeference in QGIS and record transformation, residual/error metrics, and operator.
5. Digitize boundary/purok layers separately; validate topology and attributes.
6. Field-validate disputed features and house locations using the approved collection method.
7. Export reviewed GeoJSON to staging, validate CRS/schema, and approve before canonical import.
8. Serve licensed local base resources; label synthetic development layers prominently.

No paper-map feature becomes “official” merely through digitization.

## 10. Quality attributes and verification

- Automated tests at service, constraint, API authorization, component, and workflow levels.
- Restore drills prove backups; backup creation alone is not evidence.
- Online deployment acceptance tests HTTPS, authorization, session security,
  private database/storage access and recovery. Offline map checks are optional.
- Dependency assets are checked for accidental CDN/network calls.
- Load targets await record-volume/concurrency discovery; benchmark representative datasets.
- Accessibility checks combine automation and keyboard/screen-reader review.

## 11. Recommended implementation order

1. Approve requirements, vocabulary, data owners, decisions, and access model.
2. Establish toolchain, repository safeguards, CI, environment validation, custom user,
   audit foundation, and PostgreSQL/PostGIS migrations.
3. Implement profiling core in vertical slices: resident -> housing/household -> membership
   history -> survey, including permissions, tests, and migration staging.
4. Implement GIS provenance and optional verified locations after collection policy is approved.
5. Implement staff-only appointments and its approved capacity semantics.
6. Implement complaints only after legal workflow, confidentiality, and retention review.
7. Add versioned analytics from accepted definitions; do not create a parallel data store early.
8. Conduct migration rehearsal, privacy/security review, performance/accessibility testing,
   backup restoration, online deployment/access testing, training, and UAT before go-live.

## 12. Safe work before approval

Safe now: review these documents, name stakeholders, inventory data and paper maps
without ingesting personal data into source control, prototype synthetic schemas,
evaluate hardware/network constraints, and verify compatible dependency versions.

Requires approval: major scaffolding, finalized schemas, real-data migration,
coordinate collection, case workflow, retention automation, deployment topology,
production internet exposure controls, and production procurement.

