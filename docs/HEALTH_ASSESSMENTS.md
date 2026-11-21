# Health assessments increment

`/api/v1/health/assessments/` supports list, create and retrieve with explicit
health-group access. Filter by person UUID or assessment date. Each dated record
contains optional pregnancy, family-planning, TB-screening and other-health
notes, maximum 2,000 characters each. Blank means not recorded. No diagnoses or
eligibility are inferred. Updates and deletion are disabled to preserve history.
Audit events contain identifiers and actions without health notes.

Generated migration `accounts/0002_healthassessment` is pending. No database
migration or account assignment was executed. The frontend entry form and minimal
authorized person lookup remain pending. Use synthetic data only.

Validation: eight targeted health/access tests passed; Ruff, Django system checks
and migration-drift checks passed. Database integration has not been verified.
