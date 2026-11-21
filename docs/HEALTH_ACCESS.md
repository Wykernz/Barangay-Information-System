# Explicit health access

## Barangay Payahan account roles (2026-11-21)

The requested barangay username is exactly `baranggay_admin` (including the
double g). The healthcare account sign-in is `health_center_admin`, with display
name **Health Center Admin**. Display names do not change role permissions.
The account creation command supports `--display-name`; it validates this label
before password entry and stores it in Django's existing first_name field.
The session API returns a display_name, falling back to the username if blank.

For a new healthcare account, run from an interactive terminal at the repository
root and enter the password only at the hidden local prompts:

```powershell
.\scripts\python.cmd scripts/dev.py create_staff_account health_center_admin healthcare_admin --display-name "Health Center Admin"
```

If the exact barangay account already exists, explicitly assign its approved role:

```powershell
.\scripts\python.cmd scripts/dev.py assign_staff_role baranggay_admin barangay_admin
```

If it does not exist, create it through the same hidden-password workflow:

```powershell
.\scripts\python.cmd scripts/dev.py create_staff_account baranggay_admin barangay_admin
```

These are operator instructions, not a claim that either named account has been
provisioned. No default/shared password or silent account-name matching is used.

Named-account/display-name handoff (2026-11-21): both exact usernames were absent
at the last metadata check. A visible local PowerShell setup terminal was opened
to run the two creation commands sequentially with hidden password prompts. It
captures no passwords in agent output. Final named-account creation is pending
operator password entry; do not treat opening that terminal as provisioning.
The verified development backend was restarted to load display-name responses.

Validation after display-name support: the synthetic PostgreSQL staff-role
integration check passed, including hidden-prompt creation, password hashing,
display-name session output and role isolation, with all synthetic writes rolled
back. All 87 non-database backend tests passed (8 database tests deselected),
using a new verified workspace-local pytest scratch directory because the system
pytest temporary root was inaccessible. Django check, migration consistency,
OpenAPI validation and changed-file Ruff passed. All 111 frontend tests passed
with two workers/a 20-second per-test timeout, and build/format checks passed.
Full test-database provisioning remains outside this account-name increment.

| Role | Main barangay workspace | Health |
|---|---|---|
| Healthcare administrator | Denied | Allowed |
| Barangay administrator | Allowed by assigned model permissions | Explicitly allowed |

Healthcare administrators use **Healthcare Administrators**, a health-only group
that takes precedence over other groups. The server denies other APIs, GIS,
schema and Django admin access, while allowing session/auth and health APIs.
Legacy Health Workers remain health-only. The frontend routes healthcare users
to their restricted workspace even when they visit a resident URL directly.

The barangay bundle assigns **Barangay Administrators** plus explicit **Health
Administrators** membership. It grants view/add/change for existing normal
profiling/household/GIS models, excluding sensitive-field permissions, hard
deletion, exports and arbitrary account management. Existing independent
permissions remain unchanged. Generic superuser/admin status alone does not
grant health access. This bundle does not grant unrestricted complaint access.

Create the separate healthcare account in an interactive PowerShell terminal:

```powershell
.\scripts\python.cmd scripts/dev.py create_staff_account HEALTH_USERNAME healthcare_admin
```

Replace `HEALTH_USERNAME` with the chosen username. Enter and confirm a strong
password at hidden local prompts. There is no default password, password CLI
argument or credential file. Never send passwords in chat. The command requires
an interactive terminal, validates passwords and refuses to overwrite existing
accounts. Account creation and role assignment run atomically. Healthcare-only
accounts must be non-staff, non-superuser accounts.

Assign both workspaces to the specifically selected existing barangay account:

```powershell
.\scripts\python.cmd scripts/dev.py assign_staff_role BARANGAY_USERNAME barangay_admin
```

Managed health/barangay role groups are replaced and the change is audited
without passwords. Unrelated accounts are not automatically promoted. Reload
the backend after code changes and sign out/in to refresh the UI session. This
account increment does not complete the separately pending health capture forms.

`scripts/check_staff_roles.py` validates actual PostgreSQL account creation,
password hashing, role grants, session scope and direct API isolation using
random synthetic accounts inside an always-rolled-back transaction. It requires
local DEBUG/PostgreSQL and fetches no existing resident records. It does not
provision the final named user accounts.

## Legacy command compatibility

Validation for the 2026-11-21 role increment:

- `scripts/test_backend.py accounts/test_staff_roles.py accounts/test_access.py accounts/test_health_views.py accounts/test_health_records.py --reuse-db -p no:cacheprovider`: 26 passed.
- `scripts/check_staff_roles.py`: passed against local PostgreSQL, including
  actual account creation/password hashing, refusal to overwrite an account,
  healthcare-only API denial, barangay-plus-health access, conflicting-role
  isolation and refusal to convert a privileged account. All synthetic account,
  group, permission, session and audit changes rolled back. The initial harness
  hostname error was fixed by using allowed localhost, not by loosening settings.
- Frontend `npm.cmd test`: 103 passed in 20 files; `npm.cmd run typecheck` and
  `npm.cmd run build`: passed, with the existing Vite bundle-size advisory.
- Ruff on the new access/service/command/tests and integration script: passed
  after formatting. Django check, OpenAPI validation and migration-file
  consistency: passed. This role increment adds no schema migration.
- Reloaded the verified local backend; anonymous health access returns 403.
  The requested usernames have now been supplied. Final named account provisioning
  awaits locally entered passwords. No permanent account assignment, password storage in files,
  health-data migration, commit or push was performed in this increment.

Run from the repository root for existing accounts:

```powershell
.\scripts\python.cmd scripts/dev.py assign_health_role ADMIN_USERNAME admin
.\scripts\python.cmd scripts/dev.py assign_health_role WORKER_USERNAME worker
```

Replace the uppercase placeholders with actual usernames. No passwords are
required by these commands. The worker role requires a non-staff, non-superuser
account and blocks every route except session/auth and health APIs. Admin health
access requires explicit Health Administrators membership. Remove either health
role with `assign_health_role USERNAME remove`; review other permissions before
removing worker isolation. No existing account assignments were changed during
implementation. Health capture endpoints must use HealthAccessPermission;
health forms and endpoints are still pending.

The `/api/v1/health/workspace/` endpoint now confirms explicit health access.
Both administrators and workers must belong to a designated health group;
superuser status alone does not satisfy this endpoint. `/health` in the staff
workspace shows the server-confirmed status. Health-worker accounts receive a
restricted landing page. Capture remains unavailable until the forms are built.
