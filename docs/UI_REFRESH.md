# Staff interface refresh — 2026-11-19

User-authorized visual refinement of the existing synthetic staff workspace.
Requirement references: NFR-ACC, NFR-MNT, ANA-002 presentation.

The shared interface now uses slate text, teal actions, light surfaces, consistent
spacing, and system fonts. Sidebar navigation has labeled sections, local Lucide
icons, and a clearer selected state. Account information and sign-out are grouped
in the header. The synthetic-data notice remains visible in a compact banner.

Overview places community totals before recent registrations in document order.
Summary cards use neutral backgrounds with readable values; recent profiles show
verification badges. Age groups retain the approved ranges and linked filters.
Registries, search controls, profile details, dialogs, and sign-in share the same
palette. Birthdate month/day/year controls use a compact grid with a typed year.
Dialog actions remain visible while scrolling the form.

Responsive styles provide five summary columns on wide screens, three on smaller
desktop screens, and two on mobile. Age groups use four or two columns. Small
screens retain the existing collapsible navigation and scrollable record tables.
Text labels, focus indicators, native dialog behavior and reduced-motion support
remain available. No external fonts, assets, or runtime dependencies were added.

Implementation: `frontend/src/styles/professional.css`, imported after the base
styles in `main.tsx`; navigation markup in `Workspace.tsx`; overview markup in
`pages/Dashboard.tsx`; birthdate layout classes and registry placeholder.

## Validation and limits

- `npm.cmd run typecheck`: passed.
- `npx.cmd vitest run --configLoader runner`: passed, 11 files / 42 tests.
- `npx.cmd vite build --configLoader runner`: passed.
- Headless Edge screenshot review could not complete in this environment because
  its graphics process failed. Desktop/mobile visual review, keyboard review and
  screen-reader acceptance remain outstanding; automated checks do not establish
  WCAG conformance.

Temporary synthetic preview entry files were removed. Backend authorization,
data storage, workflows and validation were preserved. Existing unrelated work
remains in the worktree. This increment is recorded in a dedicated frontend commit;
push requires explicit destination authorization following an automatic
approval-review rejection.

Final checks: targeted Prettier check passed; typecheck and production build passed again after the navigation CSS scope and search placeholder refinements.
