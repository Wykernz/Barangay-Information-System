# Household families and members — 2026-11-19

Status: synthetic session preview. These screens do not save profiling data to
PostgreSQL. Changes reset on reload/sign-out; use synthetic data only.

## Add a second family

1. Open **Households**, then **View** the household.
2. Every household already has **Family 1**. Existing synthetic members belong
   to that family; a new household starts with an empty Family 1.
3. Select **Add family** to add the second family. The name starts as **Family 2**;
   edit it if needed, check its members and select **Create family**. The household
   now has two families, each with its own card and member count.

**Choose members** on a family card changes the selection of current household
members. Selecting someone from another family reassigns them; unchecking someone
keeps them in the household without that family assignment. Duplicate family
names in the same household are rejected without regard to case/outer spaces.
A family may be created empty and populated afterward.

Editing a household never adds another default family. New people default to the
family when the household has exactly one; an explicit choice to leave someone
unassigned is preserved. No surname or family-head inference is performed.

## Water source

Household entry and details show one **Water source** field. The former Water
supply label and the duplicate housing-water detail are removed. Its existing
synthetic `waterSupply` value remains intact, including previously selected
options. Housing units keep their separate attributes on the housing-unit page;
household edits do not overwrite a shared unit's water observation.

## Add people to a family

Select **Add person** on its card. Choose an existing registered person or select
**Register a new resident**. Existing people already in the household are managed
through **Choose members**, avoiding duplicate household membership.

For an existing person, enter their relationship to the **household head**, check
the selected family and membership start date, then select **Add member**. If the
person belongs to another household, the dialog names that household and the
action becomes **Transfer member**. Transferring its head explicitly warns that
the previous household will be left without a head.

New-person registration carries the household and family into visible dropdowns.
Saving returns to the household and shows the new member in the chosen family.
Changing the household clears the family choice to prevent cross-household links.

## Member management

The member list supports name/reference search and family filters. Desktop rows
show person, derived age, relationship to household head, family and two actions:
**View** and **Manage**. Mobile styles arrange the same rows as labeled cards.

**Manage** offers family reassignment, profile editing, head selection and removal
from the household. Head selection and removal open a focused confirmation dialog
with an effective date. Removal ends membership; it does not delete the person.
Family changes supersede membership segments, preserving the household, head flag,
relationship and previous family. Editing a relationship retains the family;
transferring to a different household clears the previous family.

Household quick facts appear first. Water/sanitation observations, age counts,
membership history and archival actions use expandable sections. Occupancy
history and housing moves remain available; housing units are still separate.
No family head, surname grouping or automatic classification is inferred.

## Implementation and validation

- `HouseholdMembers.tsx`: family cards, member list and focused dialogs.
- `household.css`: responsive household layouts and member selection controls.
- `model.ts`: family reassignment with preserved membership history.
- `Profiling.tsx`: household summary, contextual registration and confirmations.
- Tests cover two families, selection/reassignment, duplicate labels, explicit
  transfer, removal/cancellation, contextual registration and historical invariants.

Executed in `frontend`:

- `npm.cmd run typecheck`: passed.
- `npx.cmd vitest run --configLoader runner`: 11 files / 49 tests passed.
- `npx.cmd vite build --configLoader runner`: passed.

Browser visual, keyboard and screen-reader review remain outstanding. The prior
local Edge screenshot attempt failed because of graphics-process errors; no
browser-based accessibility conformance is claimed. No backend changes or data
migrations were made in this increment. Unrelated worktree changes are preserved;
this increment is recorded in a dedicated frontend commit. Push requires explicit
destination authorization following an automatic approval-review rejection.

### Default-family / single-water-field validation (2026-11-20)

The first normal typecheck/test run encountered Node memory exhaustion and worker
startup failures. Validation was rerun with a 256 MB heap, 4 MB semi-space and one
test worker:

- `node --max-old-space-size=256 --max-semi-space-size=4 node_modules/typescript/bin/tsc --noEmit`: passed.
- `node --max-old-space-size=256 --max-semi-space-size=4 node_modules/vitest/vitest.mjs run --configLoader runner --maxWorkers=1`: 11 files / 53 tests passed.
- `node --max-old-space-size=256 --max-semi-space-size=4 node_modules/vite/bin/vite.js build --configLoader runner`: passed.
- Targeted `npx.cmd prettier --check` for the five changed TypeScript files: passed.

Coverage includes automatic Family 1 for existing/new households, keeping exactly
one default family on edit, creating Family 2, default new-person context, explicit
family unassignment and one Water source field with preserved selections.
