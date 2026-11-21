# Resident profiling fields

The user-approved image reference is now reflected in the resident registration/
edit page: wide navy BIMS/Barangay Payahan heading, Back action, photo panel at
left, and blue-headed Personal Information, Other Information, Residency
Information and Record Status cards at right. Existing household/family controls
follow in their own section. The layout stacks on mobile; Save/Cancel remain at
the bottom. Back/Cancel return to the resident directory or detail page.
Generated values, unknown entries, field validation and persistence are unchanged
by this visual update. The image's sample values and asterisks do not override the
approved field contract.

Layout validation (2026-11-21): headless Edge at 1536×1150 and 390×844 using
synthetic API responses passed grouped-field, generated/blank-value, horizontal
overflow, fully visible footer and navigation checks. Local screenshots were
visually reviewed; shared sidebar styles were isolated from the photo card and
footer clipping was corrected. The final frontend command
`npm.cmd test -- --run --maxWorkers=2 --testTimeout=20000` passed all 111 tests in
22 files; `npm.cmd run build` and changed-file Prettier checks passed. Assertions
were unchanged; restricted runs had five-second timeout failures and default Vite
config loading hit sandbox parent-directory permissions. The final authorized
run passed with a longer per-test timeout and two workers. The existing bundle
size advisory remains. This layout increment changes no backend schema.

Authorized by the user on 2026-11-21 for Barangay Payahan. Open Profiling →
Residents → Add resident, or open a saved resident and choose Edit details.

| Fields | Behavior |
|---|---|
| Person ID | Generated `RES-…` reference; immutable UUID remains the internal key |
| First name, middle name, surname/last name, suffix | Separate fields; middle name and suffix optional |
| Birthdate, age | Existing month/day/year control; age calculated from birthdate, never maintained in a column |
| Sex, civil status | Listed choices; Not recorded supported |
| Nationality, place of birth | Optional text; no nationality inferred |
| Contact number, email address | Optional; email validated; contact preserves formatting |
| Residency classification | Resident / Non-resident; existing unknown entries remain unknown |
| Residency status | Not recorded / Permanent resident / Renter / Boarder / Other |
| Date of registration | Server-created timestamp, read only; displayed in Philippine time |
| Profile photo | Optional JPEG/PNG; up to 5 MiB, 10 million pixels; private storage |
| Record status | Active / Moved out / Deceased / Not recorded; new form starts Active |

Record status is separate from verification and archiving. Marking a record
Deceased does not verify a death or perform a legal/records workflow.
Verification remains controlled by the existing server action; the resident form
cannot set it. Existing unknown values are not populated from sample records.

New residents and database records use the authorized `/api/v1/residents/` API.
The form waits for server confirmation, keeps failed drafts open, and opens the
generated record on success. Reopening/reloading loads paginated database records.
Profile/photo writes and their revisions are coordinated by the resident service
layer; serializers validate the API boundary and delegate the write transaction.
Archive/restore uses PATCH; there is no hard-delete UI/API operation. Legacy local
profiles keep their IDs, are labeled Local sample, and stay session only. Reset
does not delete database records. No names are used to match or merge profiles.

Household/family assignments in this workspace still use the existing session
relationship adapter. They are **not persisted by this resident-field increment**;
the form and save message say so. Sensitive extension fields are not copied into
the new fixed-field adapter. Existing custom contracts/extension values are
preserved when fixed fields are edited. No production readiness or real-data
capture approval is asserted by these changes.

Photos are re-encoded as bounded JPEGs without EXIF or original filenames.
Authenticated resident-read permission is required for
`GET /api/v1/residents/{uuid}/photo/`; health-only and unprivileged accounts are
denied. Responses are private/no-store. Replacing a photo preserves the previous
file and its revision reference. No retention period or automatic deletion is
introduced. Include private photos and profile revisions in approved backup and
retention planning. Do not publish the storage directory through static hosting.

Default storage is ignored `.local/private-media`. An operator may configure an
absolute `PRIVATE_MEDIA_ROOT` path in the private backend environment. Install
the updated backend requirements (Pillow is required), apply migrations, and
restart Django after backend changes. From the repository root:

```powershell
.\scripts\python.cmd scripts/dev.py migrate profiling 0003
.\scripts\python.cmd scripts/dev.py runserver 127.0.0.1:8000
```

Migration 0002 adds profile columns and adopts only exact compatible definitions
of the three inspected legacy columns: nullable classification varchar(20),
is_active boolean, and archived_at timestamp. Incompatible metadata aborts the
transaction. Legacy values are preserved. Reversing this migration is deliberately
unsupported to avoid dropping operational columns. Migration 0003 aligns choices
with the existing uppercase database codes, without rewriting records. The API
retains readable classification labels and lowercase verification codes; old
lowercase verification values remain readable. Hidden legacy lifecycle columns
are not mapped automatically to the new status/archive controls.

Validation commands are recorded below; test data is synthetic. The integration
script requires local DEBUG PostgreSQL, rolls back its account/profile/session/
revision/audit writes, and uses temporary private image storage.

```powershell
.\scripts\python.cmd scripts/test_backend.py profiling accounts/test_access.py accounts/test_staff_roles.py -q -p no:cacheprovider
.\scripts\python.cmd scripts/check_resident_profiles.py
.\scripts\python.cmd scripts/dev.py makemigrations --check --dry-run
.\scripts\python.cmd scripts/dev.py spectacular --validate --file ../.local/resident-schema.yml
.\.tools\python-packages\bin\ruff.exe check backend/profiling scripts/check_resident_profiles.py backend/config/settings.py
Set-Location frontend
npm.cmd run typecheck
npm.cmd test -- --run
npm.cmd run build
```

Ruff's fallback path applies to this workstation; a standard virtual environment
can use `python -m ruff check` with the same paths. Browser end-to-end review is
separate from component/API testing.

Executed 2026-11-21: profiling migrations 0002/0003 applied locally; Django
`check`, `makemigrations --check --dry-run`, OpenAPI validation, changed-file Ruff,
changed-file Prettier, `git diff --check`, frontend typecheck and build passed.
Focused backend command above: 46 passed. All backend tests without database
creation (`scripts/test_backend.py -q -p no:cacheprovider -m 'not django_db'`):
87 passed, 8 deselected. Frontend suite: 111 passed in 22 files. The PostgreSQL
rollback integration script passed. The verified local development server was
restarted for the new fields/photo endpoint.

The attempted full backend command (`scripts/test_backend.py -q -p no:cacheprovider`)
could not create `test_bims_dev`: the configured role lacks CREATEDB. It reported
93 setup errors and 2 skips; this is not a full-suite pass. No privileges were
changed and no existing database was substituted as a test database. The
`check --deploy` command reported the five existing development warnings for
HSTS, HTTPS redirect, secure session/CSRF cookies and DEBUG. Production hosting
configuration is outside this increment. Vite's build retained the existing
large-chunk advisory. No browser end-to-end check was executed.
