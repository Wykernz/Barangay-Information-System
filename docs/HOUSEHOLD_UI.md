# Household families and members — 2026-11-19

Status: synthetic session preview. These screens do not save profiling data to
PostgreSQL. Changes reset on reload/sign-out; use synthetic data only.

## Add a second family

1. Open **Households**, then **View** the household.
2. Select **Add family**, enter a family name and check the household members
   who belong to it. Select **Create family**.
3. Select **Add family** again to create another family. Each family gets its
   own card showing its name, member count and people.

**Choose members** on a family card changes the selection of current household
members. Selecting someone from another family reassigns them; unchecking someone
keeps them in the household without that family assignment. Duplicate family
names in the same household are rejected without regard to case/outer spaces.
A family may be created empty and populated afterward.

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
